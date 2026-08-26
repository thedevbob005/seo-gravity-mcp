// @ts-nocheck
import { createFileRoute } from '@tanstack/react-router';
import React from 'react';

export const Route = createFileRoute('/')({
  head: () => ({
    meta: [
      { title: 'TanStack Start Home' },
      { name: 'description', content: 'Modern full-stack SSR with TanStack Router.' }
    ]
  }),
  component: () => <h1>TanStack Home</h1>
});
