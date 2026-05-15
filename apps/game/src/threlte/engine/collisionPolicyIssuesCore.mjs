import { hasRuntimeCollisionGroupMapping } from '../constants/physicsGroupsCore.mjs'
import {
  isCollisionChannel,
  resolveCollisionChannel,
} from './collisionChannelsCore.mjs'

export function getCollisionPolicyIssues(input) {
  const issues = []
  const { collision, bodyType } = input

  if (!isCollisionChannel(collision.channel)) {
    issues.push({ code: 'invalid-channel' })
  }

  if (!hasRuntimeCollisionGroupMapping(collision)) {
    issues.push({ code: 'runtime-group-unmapped' })
  }

  const expectedChannel = resolveCollisionChannel({
    intent: collision.intent,
    bodyType,
    authoredChannel: collision.channel,
  })
  if (collision.channel !== expectedChannel) {
    issues.push({ code: 'channel-mismatch', expectedChannel })
  }

  if (collision.intent === 'trigger' && collision.sensor !== true) {
    issues.push({ code: 'trigger-not-sensor' })
  }

  if (collision.intent === 'detailMesh') {
    if (collision.sensor !== true) {
      issues.push({ code: 'detail-not-sensor' })
    }
    if (collision.channel !== 'detail') {
      issues.push({
        code: 'detail-channel-mismatch',
        expectedChannel: 'detail',
      })
    }
  }

  return issues
}

export function describeCollisionPolicyIssue(issue, input) {
  const { actorId, actorName = actorId, collision } = input
  switch (issue.code) {
    case 'invalid-channel':
      return {
        reviewCode: 'invalid-collision-channel',
        reviewMessage: `Actor "${actorName}" has an invalid collision channel.`,
        reviewRecommendation:
          'Use one of the supported collision channels before publishing.',
        buildGateMessage: `Actor "${actorId}" has an invalid collision channel.`,
      }
    case 'runtime-group-unmapped':
      return {
        reviewCode: 'collision-group-unmapped',
        reviewMessage: `Actor "${actorName}" collision channel "${collision.channel}" cannot be mapped to runtime collision groups.`,
        reviewRecommendation:
          'Use a collision intent/channel pair supported by the runtime collision group matrix.',
        buildGateMessage: `Actor "${actorId}" collision channel "${collision.channel}" cannot be mapped to runtime collision groups.`,
      }
    case 'channel-mismatch':
      return {
        reviewCode: 'collision-channel-mismatch',
        reviewMessage: `Actor "${actorName}" channel "${collision.channel}" does not match ${collision.intent} collision.`,
        reviewRecommendation: `Use channel "${issue.expectedChannel}" for this collision intent.`,
        buildGateMessage: `Actor "${actorId}" collision channel "${collision.channel}" does not match intent "${collision.intent}".`,
      }
    case 'trigger-not-sensor':
      return {
        reviewCode: 'trigger-blocks-player',
        reviewMessage: `Trigger actor "${actorName}" is not marked as a sensor.`,
        reviewRecommendation:
          'Set collision.sensor to true for trigger volumes.',
        buildGateMessage: `Trigger actor "${actorId}" must be authored as a sensor.`,
      }
    case 'detail-not-sensor':
      return {
        reviewCode: 'detail-blocks-player',
        reviewMessage: `Detail actor "${actorName}" is not marked as a sensor.`,
        reviewRecommendation:
          'Author decorative/detail collision as sensor or make it visual-only.',
        buildGateMessage: `Detail mesh actor "${actorId}" must be authored as a sensor or non-blocking diagnostic collider.`,
      }
    case 'detail-channel-mismatch':
      return {
        reviewCode: 'detail-blocks-player',
        reviewMessage: `Detail actor "${actorName}" uses channel "${collision.channel}" instead of detail.`,
        reviewRecommendation:
          'Move decorative/detail collision to the detail channel or make it visual-only.',
        buildGateMessage: `Detail mesh actor "${actorId}" collision channel "${collision.channel}" must use the detail channel.`,
      }
    default:
      return {
        reviewCode: 'unknown-collision-policy-issue',
        reviewMessage: `Actor "${actorName}" has an unknown collision policy issue.`,
        reviewRecommendation: 'Inspect the collision policy issue classifier.',
        buildGateMessage: `Actor "${actorId}" has an unknown collision policy issue.`,
      }
  }
}
