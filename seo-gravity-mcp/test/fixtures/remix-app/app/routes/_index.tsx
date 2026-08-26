// @ts-nocheck
import type { MetaFunction } from '@remix-run/node';

export const meta: MetaFunction = () => {
  return [
    { title: 'Remix Application Home' },
    { name: 'description', content: 'Modern full-stack application built with Remix.' }
  ];
};

export default function Index() {
  return (
    <div>
      <h1>Remix App</h1>
    </div>
  );
}
