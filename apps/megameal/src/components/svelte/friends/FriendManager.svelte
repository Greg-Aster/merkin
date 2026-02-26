<script>
import SharedFriendManager from '@merkin/blog-core/components/svelte/friends/FriendManager.svelte'

export let savedFriends = []
</script>

<SharedFriendManager {savedFriends} />
