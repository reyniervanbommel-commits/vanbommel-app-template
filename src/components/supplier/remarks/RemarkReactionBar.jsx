import React, { memo, useCallback, useMemo, useState } from 'react';
import { Button } from '@fluentui/react-components';
import { REACTION_EMOJIS } from './remarksFormatters';

function ReactionButton({ emoji, reaction, disabled, remarkId, onToggle }) {
  const active = Boolean(reaction?.reactedByCurrentUser);
  const count = Number(reaction?.count) || 0;
  const label = disabled
    ? `${emoji} reactions are unavailable on your own remark`
    : `${active ? 'Remove' : 'Add'} ${emoji} reaction`;

  const handleClick = useCallback(() => {
    onToggle(remarkId, emoji, !active);
  }, [active, emoji, onToggle, remarkId]);

  return (
    <Button
      className="reaction-button"
      appearance="subtle"
      size="small"
      disabled={disabled}
      aria-label={label}
      aria-pressed={active}
      onClick={handleClick}
    >
      <span aria-hidden="true">{emoji}</span>
      <span>{count}</span>
    </Button>
  );
}

function RemarkReactionBar({ remarkId, reactions = [], ownRemark = false, onToggle }) {
  const [reactionError, setReactionError] = useState('');
  const byEmoji = useMemo(() => new Map(reactions.map((reaction) => [reaction.emoji, reaction])), [reactions]);
  const buttons = useMemo(
    () =>
      REACTION_EMOJIS.map((emoji) => ({
        emoji,
        reaction: byEmoji.get(emoji),
      })),
    [byEmoji]
  );
  const handleToggle = useCallback(
    async (...args) => {
      setReactionError('');
      try {
        await onToggle(...args);
      } catch (error) {
        setReactionError(error?.message || 'Failed to update reaction');
      }
    },
    [onToggle]
  );
  const renderButton = useCallback(
    (button) => (
      <ReactionButton
        key={button.emoji}
        emoji={button.emoji}
        reaction={button.reaction}
        disabled={ownRemark}
        remarkId={remarkId}
        onToggle={handleToggle}
      />
    ),
    [handleToggle, ownRemark, remarkId]
  );

  return (
    <div>
      <div className="reaction-bar" aria-label="Remark reactions" role="toolbar">
        {buttons.map(renderButton)}
      </div>
      {reactionError ? (
        <div className="remarks-error" role="alert">
          {reactionError}
        </div>
      ) : null}
    </div>
  );
}

export default memo(RemarkReactionBar);
