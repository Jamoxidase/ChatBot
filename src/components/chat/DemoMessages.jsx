import React from 'react';

const DEMO_MESSAGES = [
  {
    label: "Show tRNA Sequences",
    message: "Show me the sequences for Selenocysteine tRNA genes in humans."
  },
  {
    label: "Compare Structures",
    message: "Can you compare the secondary structures of tRNA-SeC-TCA-1-1 and tRNA-SeC-TCA-2-1?"
  },
  {
    label: "Analyze Features",
    message: "What are the unique structural features of human Selenocysteine tRNAs?"
  }
];

export function DemoMessages({ onSelectDemo, disabled }) {
  return (
    <div className="text-center py-8 text-gray-400">
      <h2 className="text-xl font-semibold mb-2 text-gray-200">Welcome to tRNA Analysis</h2>
      <p className="mb-8">Ask questions about tRNA sequences and structures</p>
      <div className="flex flex-col gap-3 items-center max-w-xl mx-auto">
        {DEMO_MESSAGES.map((demo, index) => (
          <button
            key={index}
            onClick={() => onSelectDemo(demo.message)}
            className="w-full px-4 py-3 text-left text-sm bg-gray-800/50 border border-gray-700 
                      rounded-lg hover:bg-gray-800 hover:border-gray-600 transition-all 
                      duration-200 ease-in-out disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={disabled}
          >
            <span className="font-medium text-blue-400">{demo.label}</span>
            <p className="text-gray-400 mt-1">{demo.message}</p>
          </button>
        ))}
      </div>
    </div>
  );
}