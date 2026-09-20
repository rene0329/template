import fs from 'fs'
import path from 'path'

const topicRoot = path.resolve(__dirname, '../../../..')
const read = relativePath => fs.readFileSync(path.join(topicRoot, relativePath), 'utf8')
const api = read('template/src/api/privacyComputingApi.js')
const page = read('template/src/views/ManagementCenter/PrivacyComputing/index.vue')
const store = read('template/src/store/modules/user.js')
const header = read('template/src/layout/components/GlobalHeader.vue')

it('uses login identity and never asks users for A/B/C secrets', () => {
  expect(api).not.toContain('Basic ')
  expect(api).not.toContain('participantId')
  expect(page).not.toContain('partySecrets')
  expect(page).not.toContain('PrivacySessionPanel')
  expect(store).toContain("getInfo()")
  expect(header).toContain("roleText(role)")
})

it('submits owner-derived slot inputs and exposes pending approvals', () => {
  expect(api).toContain('/approvals/pending')
  expect(page).toContain('participantSlots')
  expect(page).toContain('inputs: this.jobForm.inputs.map')
  expect(page).toContain('ownerUserId')
  expect(page).toContain('同一任务中的数据必须来自不同业务域')
})
