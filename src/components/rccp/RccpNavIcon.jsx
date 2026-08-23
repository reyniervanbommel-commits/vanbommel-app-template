import React from 'react';

/**
 * Strategy/playbook icon (X's and O's with a curved path) for the RCCP nav item.
 * Sized like Fluent 24 Regular so it slots into AppNavItem.
 */
export default function RccpNavIcon(props) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      width="1em"
      height="1em"
      aria-hidden="true"
      focusable="false"
      {...props}
    >
      <g
        stroke="currentColor"
        strokeWidth="1.85"
        strokeLinecap="round"
        strokeLinejoin="round"
        style={{ fill: 'none', stroke: 'currentColor' }}
      >
        <path d="M4.1 4.1 8.4 8.4M8.4 4.1 4.1 8.4" />
        <path d="M12.5 15.3 16.9 19.7M16.9 15.3 12.5 19.7" />
        <circle cx="18.15" cy="5.85" r="2.45" />
        <path d="M7.7 16.35c1.55-5.15 5.15-8.15 8.05-8.7" />
      </g>
      <path
        d="M14.05 4.55 17.05 6.9 13.55 8.45Z"
        style={{ fill: 'currentColor', stroke: 'none' }}
      />
      <circle
        cx="5.55"
        cy="18.2"
        r="2.2"
        style={{ fill: 'currentColor', stroke: 'none' }}
      />
    </svg>
  );
}
