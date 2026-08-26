import { component$ } from '@builder.io/qwik';
import type { DocumentHead } from '@builder.io/qwik-city';

export default component$(() => {
  return <h1>Qwik City Home</h1>;
});

export const head: DocumentHead = {
  title: 'Qwik City Resumable Web App',
  meta: [
    { name: 'description', content: 'Instant loading Qwik City application.' }
  ]
};
