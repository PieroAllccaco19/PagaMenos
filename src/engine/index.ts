// PagaMenos · src/engine — pure, deterministic decision engine (M0 boundary placeholder).
//
// INVARIANT (mechanically enforced by eslint.config.mjs + src/lib/boundary.test.ts):
// this layer MUST NOT import db / app / analytics / sourcemon / services, Next, React,
// Prisma, or perform any I/O (fs / net / http / process / env / git). Build metadata is
// attached only at the persistence boundary (M3.5), never read inside the engine.
//
// Domain types & evaluators arrive in M1–M3. Do NOT add domain logic during M0.
export {};
