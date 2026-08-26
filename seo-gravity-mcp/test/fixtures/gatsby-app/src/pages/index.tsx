// @ts-nocheck
import * as React from 'react';
import type { HeadFC } from 'gatsby';

const IndexPage = () => {
  return <h1>Gatsby Home</h1>;
};

export default IndexPage;

export const Head: HeadFC = () => (
  <>
    <title>Gatsby Static Framework Site</title>
    <meta name="description" content="Static site built with Gatsby." />
  </>
);
