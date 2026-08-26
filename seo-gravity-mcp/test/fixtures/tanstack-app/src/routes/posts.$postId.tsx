import { createFileRoute } from '@tanstack/react-router';
import React from 'react';

export const Route = createFileRoute('/posts/$postId')({
  head: () => ({
    meta: [
      { title: 'Post Detail' }
    ]
  }),
  component: () => <article>Post Content</article>
});
