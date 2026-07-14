import React, { memo, useCallback, useMemo, useState } from 'react';
import {
  Button,
  Menu,
  MenuItem,
  MenuList,
  MenuPopover,
  MenuTrigger,
} from '@fluentui/react-components';
import { ThumbLikeRegular } from '@fluentui/react-icons';
import { REACTION_EMOJIS } from './remarksFormatters';

function RemarkReactionBar({ remarkId, reactions = [], ownRemark = false, onToggle }) {
  const [reactionError, setReactionError] = useState('');
  const byEmoji = useMemo(() => new Map(reactions.map((reaction) => [reaction.emoji, reaction])), [reactions]);
  const totalReactions = useMemo(
    () => reactions.reduce((sum, reaction) => sum + (Number(reaction?.count) || 0), 0),
    [reactions]
  );

  const handleToggle = useCallback(
    async (emoji, active) => {
      setReactionError('');
      try {
        await onToggle(remarkId, emoji, active);
      } catch (error) {
        setReactionError(error?.message || 'Failed to update reaction');
      }
    },
    [onToggle, remarkId]
  );

  const likeLabel = ownRemark
    ? 'Reactions are unavailable on your own remark'
    : totalReactions > 0
      ? `Like (${totalReactions})`
      : 'Like';

  const renderMenuItem = useCallback(
    (emoji) => {
      const reaction = byEmoji.get(emoji);
      const count = Number(reaction?.count) || 0;
      const active = Boolean(reaction?.reactedByCurrentUser);
      const label = active ? `Remove ${emoji} reaction` : `Add ${emoji} reaction`;
      const handleClick = () => handleToggle(emoji, !active);
      return (
        <MenuItem key={emoji} aria-label={label} onClick={handleClick}>
          <span aria-hidden="true">{emoji}</span>
          {count > 0 ? <span className="reaction-menu-count">{count}</span> : null}
          {active ? <span className="reaction-menu-active">Selected</span> : null}
        </MenuItem>
      );
    },
    [byEmoji, handleToggle]
  );

  return (
    <div>
      <Menu onOpenChange={() => setReactionError('')}>
        <MenuTrigger disableButtonEnhancement>
          <Button
            className="reaction-like-button"
            appearance="subtle"
            size="small"
            disabled={ownRemark}
            aria-label={likeLabel}
            icon={<ThumbLikeRegular />}
          >
            Like{totalReactions > 0 ? ` (${totalReactions})` : ''}
          </Button>
        </MenuTrigger>
        <MenuPopover>
          <MenuList aria-label="Choose a reaction">
            {REACTION_EMOJIS.map(renderMenuItem)}
          </MenuList>
        </MenuPopover>
      </Menu>
      {reactionError ? (
        <div className="remarks-error" role="alert">
          {reactionError}
        </div>
      ) : null}
    </div>
  );
}

export default memo(RemarkReactionBar);
