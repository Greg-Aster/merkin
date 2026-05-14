import {
  describeCollisionPolicyIssue as describeCollisionPolicyIssueCore,
  getCollisionPolicyIssues as getCollisionPolicyIssuesCore,
} from './collisionPolicyIssuesCore.mjs'
import type {
  CollisionChannel,
  CollisionIntent,
  PhysicsBodyType,
} from './types'

export type CollisionPolicyIssueCode =
  | 'invalid-channel'
  | 'runtime-group-unmapped'
  | 'channel-mismatch'
  | 'trigger-not-sensor'
  | 'detail-not-sensor'
  | 'detail-channel-mismatch'

export type CollisionPolicyIssue = {
  code: CollisionPolicyIssueCode
  expectedChannel?: CollisionChannel
}

export interface CollisionPolicyIssueDescription {
  reviewCode: string
  reviewMessage: string
  reviewRecommendation: string
  buildGateMessage: string
}

export function getCollisionPolicyIssues(input: {
  collision: {
    intent: CollisionIntent
    channel: CollisionChannel
    sensor?: boolean
  }
  bodyType?: PhysicsBodyType
}): CollisionPolicyIssue[] {
  return getCollisionPolicyIssuesCore(input) as CollisionPolicyIssue[]
}

export function describeCollisionPolicyIssue(
  issue: CollisionPolicyIssue,
  input: {
    actorId: string
    actorName?: string
    collision: {
      intent: CollisionIntent
      channel: CollisionChannel
    }
  },
): CollisionPolicyIssueDescription {
  return describeCollisionPolicyIssueCore(
    issue,
    input,
  ) as CollisionPolicyIssueDescription
}
