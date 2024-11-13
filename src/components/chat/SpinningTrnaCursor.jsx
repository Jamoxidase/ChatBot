import React from 'react';

export function SpinningTrnaCursor() {
  return (
    <span className="inline-block h-5 w-4 align-middle ml-1">
      <svg 
        viewBox="0 0 400 400" 
        className="h-full w-full animate-spin-slow"
      >
        <path d="M181.55 369.19c-1.35-3.02-2.11-6.37-2.11-9.89,0-10.05 6.15-18.69 14.88-22.36v-56.51c0-20.02-16.29-36.31-36.31-36.31l-55.44.05c-5.25 11.34-16.9 19.14-30.29 18.69-16.38-.55-29.96-13.71-30.99-30.06-1.18-18.66 13.67-34.23 32.09-34.23 13.09 0 24.36 7.86 29.38 19.11l51.73.19c20.02 0 36.31-16.29 36.31-36.32v-105.11c0-2.52-2.04-4.56-4.56-4.56s-4.56 2.04-4.56 4.56v105.11c0 14.99-12.2 27.19-27.19 27.19l-46.34-.22c-7.94-12.38-22.28-20.27-38.33-18.92-20.08 1.69-36.21 18.07-37.62 38.18-1.68 24.09 17.44 44.23 41.18 44.23 14.45 0 27.19-7.47 34.57-18.75h50.07c15.02 0 27.19 12.17 27.19 27.19v53.59c-8.49 6.23-13.75 16.62-12.72 28.14.31 3.51 1.22 6.86 2.61 9.95" 
          fill="currentColor"/>
        <path d="M221.6 59.33V9.44c-.05 2.48-2.07 4.47-4.56 4.47s-4.57-2.04-4.57-4.57v49.98" 
          fill="currentColor"/>
        <path d="M221.6 59.33v102.26c0 15.02 12.17 27.19 27.19 27.19h62.86c6.31-8.25 16.61-13.29 28-12.19 14.58 1.41 26.42 13.04 28.05 27.6 2.12 18.89-12.67 34.94-31.14 34.94-9.88 0-18.69-4.6-24.44-11.76h-67.73c-.61 1.86-.5 5.37 4.86 10.43 2.99 2.82 7.16 5.42 11.2 7.93 7.99 4.97 16.24 10.11 17.25 18.28.62 5.07-1.65 10.2-6.95 15.67-11.23 11.59-24.36 1.12-33.94-6.53-4.32-3.45-9.52-7.6-12.37-7.79v70.47c6.49 5.75 10.6 14.14 10.6 23.47 0 3.99-.75 7.82-2.12 11.33l-6.73-2.34c1.02-2.51 1.62-5.23 1.73-8.05.36-9.56-4.85-17.97-12.63-22.23l.02-77.51 1.43-1.35c7.86-7.42 17.37.17 25.76 6.86 11.45 9.13 16.99 12.17 21.7 7.31 2.21-2.28 4.77-5.56 4.45-8.21-.47-3.85-6.85-7.82-13.01-11.65-4.42-2.75-8.99-5.59-12.64-9.04-5.18-4.89-7.86-9.97-7.96-15.1-.11-5.8 3.18-9.33 3.56-9.72l1.34-1.37h74.79c3.92 8.14 12.22 13.78 21.84 13.78 13.82 0 24.98-11.63 24.21-25.61-.7-12.65-11.37-22.79-24.04-22.88-9.94-.07-18.51 5.88-22.31 14.4l-65.62-.04c-20.02 0-36.32-16.29-36.32-36.31V59.33h9.13Z" 
          fill="currentColor"/>
      </svg>
    </span>
  );
}