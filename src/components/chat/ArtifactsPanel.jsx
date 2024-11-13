import { useState, useMemo } from 'react';
import { ChevronDown, ChevronRight, Copy, X, ExternalLink, Box, Search } from 'lucide-react';
import JmolViewer from '../JmolViewer';

const BASE_URL = 'https://gtrnadb.ucsc.edu/genomes/eukaryota/Hsapi19/dummyDir/';

const TableRow = ({ label, value }) => (
  <div className="grid grid-cols-[200px,1fr] border-b border-gray-700 last:border-b-0">
    <div className="text-sm font-medium text-gray-300 p-3 border-r border-gray-700">
      {label}
    </div>
    <div className="text-sm text-gray-400 p-3">
      {value}
    </div>
  </div>
);


const ArtifactsPanel = ({ tableData = {}, isOpen, onClose, width }) => {
  const [expandedItems, setExpandedItems] = useState({});
  const [expandedSubfields, setExpandedSubfields] = useState({});
  const [copyStatus, setCopyStatus] = useState({});
  const [jmolData, setJmolData] = useState(null);
  const [showJmolViewer, setShowJmolViewer] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Process and deduplicate data based on gene symbol and organism
  const processedData = useMemo(() => {
    const processed = {};
    
    Object.entries(tableData).forEach(([tableName, rows]) => {
      if (!Array.isArray(rows)) return;
      
      processed[tableName] = rows.reduce((acc, row) => {
        const key = `${row.GtRNAdb_Gene_Symbol}-${row.overview?.Organism || 'unknown'}`;
        
        // If this key already exists, only update if the new data is newer
        // You might want to add a timestamp field to your data to make this more robust
        if (!acc[key] || (row.timestamp > acc[key].timestamp)) {
          acc[key] = row;
        }
        
        return acc;
      }, {});
    });

    return processed;
  }, [tableData]);

  // Filter data based on search query
  const filteredData = useMemo(() => {
    if (!searchQuery.trim()) return processedData;

    const query = searchQuery.toLowerCase();
    const filtered = {};

    Object.entries(processedData).forEach(([tableName, entries]) => {
      const filteredEntries = {};
      
      Object.entries(entries).forEach(([key, entry]) => {
        if (
          entry.GtRNAdb_Gene_Symbol?.toLowerCase().includes(query) ||
          entry.friendly_name?.toLowerCase().includes(query) ||
          entry.overview?.Organism?.toLowerCase().includes(query)
        ) {
          filteredEntries[key] = entry;
        }
      });

      if (Object.keys(filteredEntries).length > 0) {
        filtered[tableName] = filteredEntries;
      }
    });

    return filtered;
  }, [processedData, searchQuery]);

  const toggleItem = (id) => {
    setExpandedItems(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  const toggleSubfield = (itemId, subfieldKey) => {
    const key = `${itemId}-${subfieldKey}`;
    setExpandedSubfields(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  const handleOpenJmol = (blocksData) => {
    setJmolData(blocksData);
    setShowJmolViewer(true);
  };

  const copyToClipboard = async (text, id, section) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopyStatus({ id, section });
      setTimeout(() => setCopyStatus({}), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const getImageUrl = (imagePath, overview) => {
    if (overview?.Organism === 'Homo sapiens') {
      return `${BASE_URL}${imagePath}`;
    }
    return imagePath;
  };

  const renderDataField = (itemId, key, value, overview = null) => {
    const subfieldKey = `${itemId}-${key}`;
    
    if (typeof value === 'object' && value !== null) {
      return (
        <div key={key} className="mb-2">
          <button
            onClick={() => toggleSubfield(itemId, key)}
            className="flex items-center gap-2 w-full text-left px-3 py-2 hover:bg-gray-800/50 rounded-md"
          >
            {expandedSubfields[subfieldKey] ? 
              <ChevronDown size={14} className="flex-shrink-0 text-gray-400" /> : 
              <ChevronRight size={14} className="flex-shrink-0 text-gray-400" />
            }
            <span className="text-sm font-semibold text-gray-200">{key}</span>
          </button>
          {expandedSubfields[subfieldKey] && (
  <div className="ml-6 mt-2 border-2 border-gray-700 rounded-md overflow-hidden">
    {Object.entries(value).map(([subKey, subValue]) => (
      <TableRow 
        key={subKey}
        label={subKey}
        value={
          key === 'Images' ? (
            <img
              src={getImageUrl(subValue, overview)}
              alt={subKey}
              className="rounded-md border border-gray-700"
              style={{ maxWidth: '100%' }}
            />
          ) : subValue
        }
      />
    ))}
  </div>
)}
        </div>
      );
    }
  
    return <TableRow key={key} label={key} value={value} />;
  };

  const DataSection = ({ title, data, id, section, overview = null }) => {
    if (!data) return null;
    const isCopied = copyStatus.id === id && copyStatus.section === section;

    return (
      <div className="mb-4">
        <div className="flex justify-between items-center mb-2">
          <span className="text-sm font-medium text-gray-300">{title}</span>
          <button
            onClick={() => copyToClipboard(JSON.stringify(data, null, 2), id, section)}
            className="p-1.5 hover:bg-gray-700 rounded-md transition-colors flex items-center gap-1 text-xs text-gray-400"
          >
            <Copy size={14} />
            {isCopied ? 'Copied!' : 'Copy'}
          </button>
        </div>
        
        <div className="bg-gray-900 rounded-md overflow-hidden border border-gray-700">
          {Object.entries(data).map(([key, value]) =>
            renderDataField(id, key, value, overview)
          )}
        </div>
      </div>
    );
  };

  if (!isOpen) return null;

  return (
    <>
      <div style={{ width }} className="h-full border-r border-gray-700 bg-gray-900 flex flex-col">
        <div className="flex justify-between items-center px-4 py-3 border-b border-gray-700 bg-gray-800">
          <h2 className="text-lg font-semibold text-gray-100">Data Explorer</h2>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-gray-700 rounded-md transition-colors text-gray-400 
                     hover:text-gray-200"
            aria-label="Close panel"
          >
            <X size={18} />
          </button>
        </div>

        <div className="px-4 py-2 border-b border-gray-700">
          <div className="relative">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by gene symbol..."
              className="w-full pl-9 pr-4 py-2 bg-gray-800 border border-gray-700 rounded-md 
                       text-sm text-gray-200 placeholder-gray-500
                       focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-500" />
          </div>
        </div>

        <div className="overflow-y-auto flex-1 px-4 py-2">
          {Object.entries(filteredData).map(([tableName, entries]) => (
            <div key={tableName} className="mb-6">
              <div className="mb-2 flex items-center justify-between">
                <h3 className="text-md font-semibold text-gray-200 capitalize">
                  {tableName}
                </h3>
                <span className="text-sm text-gray-400">
                  {Object.keys(entries).length} entries
                </span>
              </div>

              {Object.entries(entries).map(([key, data], index) => (
                <div key={key} className="mb-3 rounded-lg border border-gray-700 bg-gray-800">
                  <div className="flex items-center justify-between p-3 hover:bg-gray-700/50 
                                transition-colors rounded-lg">
                    <button
                      onClick={() => toggleItem(key)}
                      className="flex items-center gap-2 text-left flex-1"
                    >
                      {expandedItems[key] ? 
                        <ChevronDown size={18} className="text-gray-400" /> : 
                        <ChevronRight size={18} className="text-gray-400" />
                      }
                      <span className="font-medium text-gray-100">
                        {data.friendly_name || data.GtRNAdb_Gene_Symbol || `Entry ${index + 1}`}
                      </span>
                      {data.overview?.Organism && (
                        <span className="text-sm text-gray-400">
                          ({data.overview.Organism})
                        </span>
                      )}
                    </button>
                    {data.tool_data?.blocks_file && (
                      <button
                        onClick={() => handleOpenJmol(data.tool_data.blocks_file)}
                        className="p-1.5 hover:bg-gray-700 rounded-md transition-colors"
                        title="View 3D Structure"
                      >
                        <Box size={18} className="text-blue-400" />
                      </button>
                    )}
                  </div>
                  
                  {expandedItems[key] && (
                    <div className="p-3 border-t border-gray-700">
                      <DataSection 
                        title="Core Data" 
                        data={{
                          GtRNAdb_Gene_Symbol: data.GtRNAdb_Gene_Symbol,
                          tRNAscan_SE_ID: data.tRNAscan_SE_ID,
                          Anticodon: data.Anticodon,
                          Isotype_from_Anticodon: data.Isotype_from_Anticodon,
                          Sequence: data.sequences,
                          Overview: data.overview,
                          Images: data.images,
                          
                        }}
                        id={key}
                        section="core"
                        overview={data.overview}
                      />
                      
                      {data.tool_data?.trnascan_se_ss && (
                        <DataSection 
                          title="tRNAscan-SE Structure" 
                          data={data.trnascan_se_ss} 
                          id={key}
                          section="trnascan"
                        />
                      )}
                      
                      {data.tool_data?.sprinzl_pos && (
                        <DataSection 
                          title="Sprinzl Positions" 
                          data={data.sprinzl_pos} 
                          id={key}
                          section="sprinzl"
                          overview={data.overview}
                        />
                      )}

                      {data.rnacentral_link && (
                        <div className="mt-4 pt-3 border-t border-gray-700">
                          <a
                            href={data.rnacentral_link}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1.5 text-sm text-blue-400 
                                     hover:text-blue-300"
                          >
                            <ExternalLink size={16} />
                            View on RNA Central
                          </a>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>

      {showJmolViewer && jmolData && (
        <JmolViewer data={jmolData} onClose={() => setShowJmolViewer(false)} />
      )}
    </>
  );
};

export default ArtifactsPanel;