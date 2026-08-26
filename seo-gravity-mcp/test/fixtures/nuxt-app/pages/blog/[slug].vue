<script setup>
const route = useRoute()
useSeoMeta({
  title: `Nuxt Blog - ${route.params.slug}`
})
</script>

<template>
  <article>
    <h1>Blog Post</h1>
  </article>
</template>
