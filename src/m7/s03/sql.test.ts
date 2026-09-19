import { describe, expect, it } from 'vitest';

import { SqlLexError, splitParenthesised, splitStatements } from './sql';

describe('M7-S03 SQL lexer', () => {
  it('splits top-level statements and keeps dollar-quoted bodies whole', () => {
    const sql = [
      '-- leading comment; with a semicolon',
      'CREATE TABLE m7.t (a int); /* block ; */',
      'CREATE FUNCTION m7.f() RETURNS void LANGUAGE plpgsql AS $fn$',
      "BEGIN PERFORM 1; RAISE NOTICE 'x;y'; END",
      '$fn$;',
      "SELECT 'it''s; fine';",
      '',
    ].join('\n');
    const st = splitStatements(sql);
    expect(st.map((s) => s.text.split('\n')[0])).toEqual([
      'CREATE TABLE m7.t (a int);',
      'CREATE FUNCTION m7.f() RETURNS void LANGUAGE plpgsql AS $fn$',
      "SELECT 'it''s; fine';",
    ]);
    expect(st[0]!.line).toBe(2);
    expect(st[1]!.text.endsWith('$fn$;')).toBe(true);
    // comments are blanked in `code`, offsets preserved
    expect(st[0]!.code.length).toBe(st[0]!.text.length);
  });

  it('refuses unterminated quotes', () => {
    expect(() => splitStatements('SELECT $x$ never closed')).toThrow(SqlLexError);
    expect(() => splitStatements("SELECT 'open")).toThrow(SqlLexError);
  });

  it('splits a parenthesised list at top-level commas only', () => {
    const { items, close } = splitParenthesised('(a text, b m7."E"[], c numeric(10,2)) RETURNS x');
    expect(items.map((i) => i.trim())).toEqual(['a text', 'b m7."E"[]', 'c numeric(10,2)']);
    expect(close).toBe(36);
    expect(splitParenthesised('()').items).toEqual([]);
  });
});
