import { Suspense } from 'react';
import TutorClient from './TutorClient';

export default function TutorPage() {
  return (
    <Suspense fallback={<div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', color: '#555', fontFamily: 'monospace' }}>Loading...</div>}>
      <TutorClient />
    </Suspense>
  );
}