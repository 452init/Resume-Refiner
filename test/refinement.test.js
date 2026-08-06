import assert from 'node:assert/strict';
import test from 'node:test';
import { buildRefinement, formatBytes, isPdfFile } from '../src/refinement.js';

test('accepts PDF files by MIME type or extension only', () => {
  assert.equal(isPdfFile({ name: 'resume.pdf', type: 'application/pdf' }), true);
  assert.equal(isPdfFile({ name: 'RESUME.PDF', type: '' }), true);
  assert.equal(isPdfFile({ name: 'resume.docx', type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' }), false);
  assert.equal(isPdfFile(null), false);
});

test('formats byte counts for upload feedback', () => {
  assert.equal(formatBytes(0), '0 KB');
  assert.equal(formatBytes(512), '512 B');
  assert.equal(formatBytes(2048), '2.0 KB');
});

test('builds a higher-signal refinement for AI API roles without fabricating claims', () => {
  const result = buildRefinement({
    sourceType: 'api',
    resumeName: 'candidate.pdf',
    jobSignal: 'AI backend API engineer with AWS and product collaboration',
    resumeText: 'Existing resume text'
  });

  assert.equal(result.score, 82);
  assert.match(result.refinedResume, /Uploaded file: candidate\.pdf/);
  assert.match(result.refinedResume, /This draft reframes existing experience only/);
  assert.ok(result.signals.some((signal) => signal.includes('API design')));
  assert.ok(result.gaps.some((gap) => gap.includes('Cloud provider details')));
});
