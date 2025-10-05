<template>
  <div class="iframe-mandelbrot-low-precision">
    <iframe
      id="myIframe"
      :src="mandelbrotUrl"
      width="100%"
      height="500"
      frameborder="0"
      allowfullscreen
    ></iframe>
  </div>
</template>

<script setup lang="ts">
const mandelbrotUrl =
  'https://mandelbrot.silversky.dev/?workers=1&theme=royal';
// Supposons que l'iframe a l'id "myIframe"
const iframe = document.getElementById('myIframe');
if (iframe) {
  iframe.setAttribute('sandbox', 'allow-scripts allow-same-origin');
}


</script>

<style scoped>
.iframe-mandelbrot-low-precision {
  width: 100%;
  max-width: 900px;
  margin: 0 auto;
}
iframe {
  border: none;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.1);
}
</style>

