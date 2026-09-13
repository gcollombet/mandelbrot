import { canonicalJson } from './appearance'
import { DISPLAY_SAMPLE_BYTES, shaderBlockAt, validateShaderManifest, type ShaderExpmapManifest } from './displayFormat'
import { decodeDisplayFrame, encodeDisplayFrame } from './displayCodec'

/** Random-access file: an OPFS sync access handle, or memory in tests. */
export interface ArchiveFile {
  size():number
  read(at:number,length:number):Uint8Array
  write(at:number,data:Uint8Array):void
  truncate(size:number):void
  flush():void|Promise<void>
  close():void
}

export class MemoryArchiveFile implements ArchiveFile {
  data=new Uint8Array(0)
  size() {return this.data.length}
  read(at:number,length:number) {return this.data.slice(at,at+length)}
  write(at:number,data:Uint8Array) {
    if(at+data.length>this.data.length) {const next=new Uint8Array(at+data.length);next.set(this.data);this.data=next}
    this.data.set(data,at)
  }
  truncate(size:number) {this.data=this.data.slice(0,size)}
  flush() {}
  close() {}
}

/** Single-file source. Fixed header, manifest JSON, fixed-size table addressed
 * arithmetically, then compressed frames appended in production order. The
 * `completed` counter in the header is the commit point: it is written last,
 * after the frame and its table entry are flushed. */
const MAGIC=0x31414d53 // 'SMA1'
export const ARCHIVE_HEADER_BYTES=64, ARCHIVE_ENTRY_BYTES=24
const STATES:ShaderExpmapManifest['state'][]=['preparing','interrupted','complete']
type Header={total:number;completed:number;state:number;generation:number;manifestOffset:number;manifestLength:number;tableOffset:number;dataStart:number;dataEnd:number}

function readHeader(file:ArchiveFile):Header {
  if(file.size()<ARCHIVE_HEADER_BYTES)throw new Error('Archive shader vide ou tronquée')
  const b=file.read(0,ARCHIVE_HEADER_BYTES),v=new DataView(b.buffer,b.byteOffset,b.byteLength)
  if(v.getUint32(0,true)!==MAGIC||v.getUint32(4,true)!==1)throw new Error('Format d’archive shader incompatible')
  return {total:v.getUint32(8,true),completed:v.getUint32(12,true),state:v.getUint32(16,true),generation:v.getUint32(20,true),
    manifestOffset:Number(v.getBigUint64(24,true)),manifestLength:v.getUint32(32,true),tableOffset:Number(v.getBigUint64(40,true)),
    dataStart:Number(v.getBigUint64(48,true)),dataEnd:Number(v.getBigUint64(56,true))}
}
function writeHeader(file:ArchiveFile,h:Header) {
  const b=new Uint8Array(ARCHIVE_HEADER_BYTES),v=new DataView(b.buffer)
  v.setUint32(0,MAGIC,true);v.setUint32(4,1,true);v.setUint32(8,h.total,true);v.setUint32(12,h.completed,true);v.setUint32(16,h.state,true);v.setUint32(20,h.generation,true)
  v.setBigUint64(24,BigInt(h.manifestOffset),true);v.setUint32(32,h.manifestLength,true);v.setBigUint64(40,BigInt(h.tableOffset),true)
  v.setBigUint64(48,BigInt(h.dataStart),true);v.setBigUint64(56,BigInt(h.dataEnd),true)
  file.write(0,b)
}

export class ShaderExpmapArchive {
  readonly file:ArchiveFile
  private header?:Header
  constructor(file:ArchiveFile) {this.file=file}
  private manifestFrom(h:Header):ShaderExpmapManifest {
    const base=JSON.parse(new TextDecoder().decode(this.file.read(h.manifestOffset,h.manifestLength))) as ShaderExpmapManifest
    const m={...base,completed:h.completed,state:STATES[h.state]??'interrupted',generation:h.generation}
    validateShaderManifest(m);return m
  }
  /** Reads the header on each call: the file is the single source of truth. */
  async open():Promise<ShaderExpmapManifest> {
    this.header=readHeader(this.file)
    if(this.header.dataEnd>this.file.size())throw new Error('Archive shader tronquée')
    return this.manifestFrom(this.header)
  }
  isEmpty() {return this.file.size()===0}
  async assertEmpty() {if(!this.isEmpty())throw new Error('L’archive existe déjà')}
  /** Create the fixed layout for a fresh manifest. */
  async create(m:ShaderExpmapManifest) {
    await this.assertEmpty();validateShaderManifest(m)
    const json=new TextEncoder().encode(canonicalJson({...m,completed:0,state:'preparing',generation:0}))
    const manifestOffset=ARCHIVE_HEADER_BYTES,tableOffset=manifestOffset+json.length,dataStart=tableOffset+m.total*ARCHIVE_ENTRY_BYTES
    this.header={total:m.total,completed:0,state:0,generation:0,manifestOffset,manifestLength:json.length,tableOffset,dataStart,dataEnd:dataStart}
    this.file.write(manifestOffset,json);this.file.write(tableOffset,new Uint8Array(m.total*ARCHIVE_ENTRY_BYTES))
    writeHeader(this.file,this.header);await this.file.flush()
    return this.manifestFrom(this.header)
  }
  private entry(index:number) {
    const h=this.header!,b=this.file.read(h.tableOffset+index*ARCHIVE_ENTRY_BYTES,ARCHIVE_ENTRY_BYTES),v=new DataView(b.buffer,b.byteOffset,b.byteLength)
    return {offset:Number(v.getBigUint64(0,true)),length:v.getUint32(8,true),raw:v.getUint32(12,true),index:v.getUint32(16,true)}
  }
  /** State and generation changes; `completed` only moves through append or a resume rollback. */
  async publish(m:ShaderExpmapManifest) {
    validateShaderManifest(m)
    const h=this.header??readHeader(this.file)
    if(m.total!==h.total||m.completed>h.total)throw new Error('Manifeste incompatible avec l’archive')
    if(m.completed<h.completed) {
      // Rollback: frames past the new frontier are orphaned and rewritten from there.
      h.dataEnd=m.completed?this.entry(m.completed-1).offset+this.entry(m.completed-1).length:h.dataStart
      this.file.truncate(h.dataEnd)
    } else if(m.completed>h.completed)throw new Error('Un bloc ne se publie que par ajout')
    h.completed=m.completed;h.state=Math.max(0,STATES.indexOf(m.state));h.generation=m.generation
    writeHeader(this.file,h);await this.file.flush();this.header=h
  }
  async append(m:ShaderExpmapManifest,payload:Uint8Array):Promise<ShaderExpmapManifest> {
    const h=this.header??readHeader(this.file);this.header=h
    if(m.completed!==h.completed)throw new Error('Checkpoint désynchronisé')
    const index=m.completed,block=shaderBlockAt(m.projection,index),expected=block.useful.width*block.useful.height*DISPLAY_SAMPLE_BYTES
    if(payload.length!==expected)throw new Error('Taille de bloc shader invalide')
    const frame=await encodeDisplayFrame(payload)
    this.file.write(h.dataEnd,frame)
    const e=new Uint8Array(ARCHIVE_ENTRY_BYTES),v=new DataView(e.buffer)
    v.setBigUint64(0,BigInt(h.dataEnd),true);v.setUint32(8,frame.length,true);v.setUint32(12,expected,true);v.setUint32(16,index,true)
    this.file.write(h.tableOffset+index*ARCHIVE_ENTRY_BYTES,e)
    await this.file.flush()
    h.dataEnd+=frame.length;h.completed=index+1;h.generation=m.generation+1
    writeHeader(this.file,h);await this.file.flush()
    return {...m,generation:h.generation,completed:h.completed}
  }
  async read(m:ShaderExpmapManifest,index:number,signal?:AbortSignal):Promise<Uint8Array<ArrayBuffer>> {
    signal?.throwIfAborted()
    if(!Number.isSafeInteger(index)||index<0||index>=m.completed)throw new Error('Bloc non publié')
    if(!this.header)this.header=readHeader(this.file)
    const block=shaderBlockAt(m.projection,index),expected=block.useful.width*block.useful.height*DISPLAY_SAMPLE_BYTES
    const e=this.entry(index)
    if(e.index!==index||e.raw!==expected||e.offset+e.length>this.file.size())throw new Error(`Entrée du bloc ${index} invalide`)
    const payload=await decodeDisplayFrame(this.file.read(e.offset,e.length),expected)
    signal?.throwIfAborted()
    return payload as Uint8Array<ArrayBuffer>
  }
  /** Bytes actually stored for the committed frames. */
  storedBytes() {const h=this.header??readHeader(this.file);return h.dataEnd}
}
