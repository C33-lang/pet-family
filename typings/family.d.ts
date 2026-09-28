interface FamilyInfo {
  familyId: string
  role: 'owner' | 'member'
  name: string
  inviteCode: string
  inviteExpireAt: number
  memberCount: number
}
