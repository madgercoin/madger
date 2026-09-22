import assert from 'node:assert/strict'
import test from 'node:test'
import { COMMANDS, capabilityDirectory } from '../src/commands.js'

test('Discord command names are unique and within platform limits', () => {
  const names = COMMANDS.map(command => command.name)
  assert.equal(new Set(names).size, names.length)
  for (const command of COMMANDS) {
    assert.ok(command.name.length <= 32)
    if (command.description) assert.ok(command.description.length <= 100)
  }
})

test('command groups stay below Discord option limits', () => {
  for (const command of COMMANDS) assert.ok((command.options?.length ?? 0) <= 25)
})

test('capability directory states the safety boundary', () => {
  const directory = capabilityDirectory()
  assert.match(directory, /edited-message scanning/)
  assert.match(directory, /no wallet custody/)
  assert.match(directory, /human-reviewed points/)
})
