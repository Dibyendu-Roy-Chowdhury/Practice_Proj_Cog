/**
 * EmptyState — consistent zero-data and no-selection placeholders.
 */

import React from 'react';
import { Inbox, Search, AlertCircle, MousePointerClick } from 'lucide-react';

const ICONS = {
  inbox:  Inbox,
  search: Search,
  error:  AlertCircle,
  select: MousePointerClick,
};

/**
 * @param {object} props
 * @param {'inbox'|'search'|'error'|'select'} [props.icon='inbox']
 * @param {string} props.title
 * @param {string} [props.description]
 * @param {React.ReactNode} [props.action]   — optional button / link
 * @param {number} [props.iconSize=40]
 * @param {string} [props.style]
 */
const EmptyState = ({
  icon = 'inbox',
  title,
  description,
  action,
  iconSize = 40,
  style = {},
}) => {
  const Icon = ICONS[icon] || Inbox;

  return (
    <div
      style={{
        display:        'flex',
        flexDirection:  'column',
        alignItems:     'center',
        justifyContent: 'center',
        padding:        '48px 24px',
        textAlign:      'center',
        ...style,
      }}
    >
      <div
        style={{
          width:           iconSize + 24,
          height:          iconSize + 24,
          borderRadius:    '50%',
          background:      '#F0F4F8',
          display:         'flex',
          alignItems:      'center',
          justifyContent:  'center',
          marginBottom:    16,
        }}
      >
        <Icon size={iconSize} strokeWidth={1.4} color="#94A3B8" />
      </div>

      <p style={{ margin: '0 0 6px', fontSize: 14, fontWeight: 600, color: '#344054' }}>
        {title}
      </p>

      {description && (
        <p style={{ margin: '0 0 20px', fontSize: 13, color: '#98A2B3', maxWidth: 320, lineHeight: 1.6 }}>
          {description}
        </p>
      )}

      {action}
    </div>
  );
};

export default EmptyState;
