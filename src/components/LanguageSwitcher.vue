<script setup lang="ts">
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';
import { SUPPORTED_LOCALES, setLocale, type AppLocale } from '../i18n';

defineProps<{
  /** Compact chrome for the top bar (two-letter codes, no label). */
  compact?: boolean;
}>();

const { t, locale } = useI18n();
const current = computed(() => locale.value as AppLocale);

function choose(next: AppLocale) {
  if (next !== current.value) setLocale(next);
}
</script>

<template>
  <div class="lang-switch" :class="{ compact }" role="radiogroup" :aria-label="t('common.language')">
    <span v-if="!compact" class="lang-label">{{ t('common.language') }}</span>
    <button
      v-for="code in SUPPORTED_LOCALES"
      :key="code"
      type="button"
      role="radio"
      class="lang-btn"
      :class="{ on: code === current }"
      :aria-checked="code === current"
      :title="t(`common.languageName.${code}`)"
      :lang="code"
      @click="choose(code)"
    >{{ compact ? code.toUpperCase() : t(`common.languageName.${code}`) }}</button>
  </div>
</template>

<style scoped>
.lang-switch {
  display: inline-flex;
  align-items: center;
  gap: 6px;
}
.lang-label {
  font-size: 0.8rem;
  color: var(--ink-2, #aaa);
}
.lang-btn {
  appearance: none;
  border: 1px solid color-mix(in srgb, currentColor 22%, transparent);
  background: transparent;
  color: inherit;
  font: inherit;
  font-size: 0.78rem;
  line-height: 1;
  padding: 5px 8px;
  border-radius: 6px;
  cursor: pointer;
  opacity: 0.7;
}
.lang-btn:hover { opacity: 1; }
.lang-btn.on {
  opacity: 1;
  background: color-mix(in srgb, currentColor 14%, transparent);
  font-weight: 600;
}
.compact .lang-btn { padding: 4px 6px; font-size: 0.72rem; letter-spacing: 0.04em; }
.compact .lang-btn + .lang-btn { margin-left: -1px; }
</style>
