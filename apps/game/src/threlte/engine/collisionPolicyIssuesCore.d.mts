export type CollisionPolicyIssueCode =
  | 'invalid-channel'
  | 'runtime-group-unmapped'
  | 'channel-mismatch'
  | 'trigger-not-sensor'
  | 'detail-not-sensor'
  | 'detail-channel-mismatch'

export interface CollisionPolicyIssue {
  code: CollisionPolicyIssueCode
  expectedChannel?: string
}

export interface CollisionPolicyIssueDescription {
  reviewCode: string
  reviewMessage: string
  reviewRecommendation: string
  buildGateMessage: string
}

export function getCollisionPolicyIssues(input: {
  collision: {
    intent: string
    channel: string
    sensor?: boolean
  }
  bodyType?: string | null
}): CollisionPolicyIssue[]

export function describeCollisionPolicyIssue(
  issue: CollisionPolicyIssue,
  input: {
    actorId: string
    actorName?: string
    collision: {
      intent: string
      channel: string
    }
  },
): CollisionPolicyIssueDescription
