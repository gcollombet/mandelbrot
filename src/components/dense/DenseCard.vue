<script setup lang="ts">
defineProps<{
  name: string;
  sub?: string;
  /** Thumbnail image URL; if omitted, the default slot fills the thumb area. */
  thumb?: string;
  selected?: boolean;
  favorite?: boolean;
  /** Show the favorite (heart) action. */
  favoritable?: boolean;
  /** Show the delete action. */
  deletable?: boolean;
  /** Label shown in the selected badge. */
  badge?: string;
}>();
const emit = defineEmits<{
  (e: 'select'): void;
  (e: 'favorite'): void;
  (e: 'delete'): void;
}>();
</script>

<template>
  <div class="card" :class="{ sel: selected }" @click="emit('select')">
    <span class="sel-badge">{{ badge || 'Actif' }}</span>
    <div class="acts">
      <button
        v-if="favoritable"
        class="abtn heart"
        :class="{ faved: favorite }"
        title="Favori"
        @click.stop="emit('favorite')"
      >
        <svg viewBox="0 0 24 24"><path d="M12 20s-7-4.6-9-9c-1.2-2.7.6-6 3.8-6 2 0 3.4 1.2 5.2 3.4C13.8 6.2 15.2 5 17.2 5c3.2 0 5 3.3 3.8 6-2 4.4-9 9-9 9z"/></svg>
      </button>
      <button v-if="deletable" class="abtn del" title="Supprimer" @click.stop="emit('delete')">
        <svg viewBox="0 0 24 24"><path d="M5 7h14M9 7V5h6v2M6 7l1 13h10l1-13"/></svg>
      </button>
    </div>
    <img v-if="thumb" class="thumb" :src="thumb" :alt="name" />
    <div v-else class="thumb"><slot name="thumb" /></div>
    <div class="info">
      <div class="nm">{{ name }}</div>
      <div v-if="sub || $slots.sub" class="sub">{{ sub }}<slot name="sub" /></div>
    </div>
  </div>
</template>
