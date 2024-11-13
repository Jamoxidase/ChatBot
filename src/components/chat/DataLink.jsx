import { useState } from 'react';
import { ChevronDown, ChevronRight, ExternalLink, Copy, Check, ImageIcon, FileText } from 'lucide-react';

const BASE_URL = 'https://gtrnadb.ucsc.edu/genomes/eukaryota/Hsapi19/dummyDir/';

const formatSprinzlPos = (content) => {
  if (!content || typeof content !== 'string') return '';

  const lines = content.split('\n').filter(line => line.trim());
  const headerLines = lines.filter(line => line.startsWith('#')).join('\n');
  const dataLines = lines.filter(line => !line.startsWith('#'));
  const maxPosLength = Math.max(...dataLines.map(line => line.split('\t')[0].length));

  const formattedData = dataLines.map(line => {
    const [pos, base] = line.split('\t');
    return `${pos.padEnd(maxPosLength, ' ')}\t${base}`;
  }).join('\n');

  return [headerLines, formattedData].join('\n\n');
};

const CopyButton = ({ text, className }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    if (!text) return;
    
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  return (
    <button
      onClick={handleCopy}
      className={`inline-flex items-center gap-1.5 px-2 py-1 text-gray-400 hover:text-gray-300 
                 hover:bg-gray-700 rounded-md transition-colors text-sm ${className}`}
      title="Copy to clipboard"
    >
      {copied ? (
        <>
          <Check size={14} />
          <span>Copied!</span>
        </>
      ) : (
        <>
          <Copy size={14} />
          <span>Copy</span>
        </>
      )}
    </button>
  );
};

const ImageLink = ({ path, entry }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  
  const getImageUrl = () => {
    if (!path) return '';
    if (entry?.overview?.Organism === 'Homo sapiens') {
      return `${BASE_URL}${path}`;
    }
    return path;
  };

  return (
    <span className="inline-block">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="inline-flex items-center gap-1.5 px-2 py-1 text-blue-400 hover:text-blue-300 
                   bg-gray-800 hover:bg-gray-700 rounded-md transition-colors text-sm"
      >
        <ImageIcon size={14} className="text-gray-400" />
        <span>View Image</span>
        {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
      </button>
      {isExpanded && path && (
        <div className="mt-2 rounded-lg overflow-hidden border border-gray-700 bg-white p-2">
          <img
            src={getImageUrl()}
            alt="tRNA structure"
            className="max-w-full rounded-md"
          />
        </div>
      )}
    </span>
  );
};

const DataLink = ({ tag, tableData }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  
  const matches = tag.match(/<([^>]+)>/);
  if (!matches) return tag;
  
  const parts = matches[1].split('/');
  const identifier = parts[0];
  const pathParts = parts.slice(1);

  if (!identifier || !tableData || !Array.isArray(Object.values(tableData).flat())) {
    return tag;
  }

  const entry = Object.values(tableData)
    .flat()
    .find(item => item?.GtRNAdb_Gene_Symbol === identifier);
  
  if (!entry) return tag;
  
  let value = entry;
  for (const part of pathParts) {
    value = value?.[part];
    if (value === undefined || value === null) {
      return tag;
    }
  }

  const isImage = pathParts.includes('images') ||
    (typeof value === 'string' && 
     (value.endsWith('.png') || value.endsWith('.jpg') || value.endsWith('.svg')));

  const isUrl = typeof value === 'string' && 
    (value.startsWith('http://') || value.startsWith('https://'));

  const isSprinzl = pathParts.includes('sprinzl_pos');
  const isSimpleField = ['GtRNAdb_Gene_Symbol', 'Isotype_from_Anticodon', 'General_tRNA_Model_Score', 'Isotype_Model_Score', 'Anticodon', 'Locus', 'Features' ].includes(pathParts.join('/'));

  if (isImage) {
    return <ImageLink path={value} entry={entry} />;
  }

  if (isUrl) {
    return (
      <a
        href={value}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-1.5 px-2 py-1 text-blue-400 hover:text-blue-300 
                   bg-gray-800 hover:bg-gray-700 rounded-md transition-colors text-sm"
      >
        <ExternalLink size={14} />
        <span>{String(value || '')}</span>
      </a>
    );
  }

  const safeValue = value?.toString() || '';
  
  if (isSimpleField) {
    return (
      <span className="inline-flex items-center gap-1.5 px-2 py-1 text-blue-400 bg-gray-800/50 rounded-md transition-colors text-sm">
        <span>{safeValue}</span>
        <CopyButton text={safeValue} />
      </span>
    );
  }

  const buttonText = isSprinzl ? 'Sprinzl alignment' : (
    isSimpleField ? safeValue : 
    `${safeValue.slice(0, 20)}${safeValue.length > 20 ? '...' : ''}`
  );

  return (
    <span className="inline-block">
      <div className="flex items-center gap-2">
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="inline-flex items-center gap-1.5 px-2 py-1 text-blue-400 hover:text-blue-300 
                     bg-gray-800 hover:bg-gray-700 rounded-md transition-colors text-sm"
        >
          {isSprinzl ? <FileText size={14} className="text-gray-400" /> : null}
          <span>{buttonText || 'Empty content'}</span>
          {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
        </button>
        {!isImage && !isUrl && value && (
          <CopyButton 
            text={isSprinzl ? formatSprinzlPos(safeValue) : safeValue}
          />
        )}
      </div>
      {isExpanded && (
        <div className="mt-2 rounded-lg border border-gray-700 bg-gray-800/50 p-3">
          <pre className="whitespace-pre font-mono text-sm text-gray-300">
            {isSprinzl ? 
              formatSprinzlPos(safeValue) :
              typeof value === 'object' ? 
                JSON.stringify(value, null, 2) : 
                safeValue
            }
          </pre>
        </div>
      )}
    </span>
  );
};

export const parseMessageContent = (content, tableData) => {
  if (!content) return null;
  
  try {
    const parts = content.split(/(<[^>]+>)/).filter(Boolean);
    return parts.map((part, index) => {
      if (part.startsWith('<') && part.endsWith('>')) {
        return <DataLink key={index} tag={part} tableData={tableData} />;
      }
      return part;
    });
  } catch (error) {
    console.error('Error parsing message content:', error);
    return content;
  }
};

export default DataLink;