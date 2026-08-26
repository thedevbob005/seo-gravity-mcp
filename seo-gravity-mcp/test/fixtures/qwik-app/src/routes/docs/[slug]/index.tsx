import { component$ } from '@builder.io/qwik';
import type { DocumentHead } from '@builder.io/qwik-city';

export default component$(() => {
  return <article>Docs Page</article>;
});

export const head: DocumentHead = {
  title: 'Documentation'
};
