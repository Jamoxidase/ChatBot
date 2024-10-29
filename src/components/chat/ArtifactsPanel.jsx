import { useState } from 'react';
import { ChevronDown, ChevronRight, Copy, X, ExternalLink, Box } from 'lucide-react';
import JmolViewer from '../JmolViewer';

const ArtifactsPanel = ({ sequences, isOpen, onClose, width }) => {
  const [expandedItems, setExpandedItems] = useState({});
  const [copyStatus, setCopyStatus] = useState({});
  const [jmolData, setJmolData] = useState(null);
  const [showJmolViewer, setShowJmolViewer] = useState(false);

  const toggleItem = (id) => {
    setExpandedItems(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  const handleOpenJmol = (blocksData) => {
    //console.log
    console.log('=== Opening JMol Viewer ===');
    console.log('1. Blocks data type:', typeof blocksData);
    console.log('2. Blocks data length:', blocksData.length);
    console.log('3. First 100 characters:', blocksData.substring(0, 100));
    
    setJmolData(blocksData);
    setShowJmolViewer(true);
  };

  const copyToClipboard = async (text, id, section) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopyStatus({ id, section });
      setTimeout(() => setCopyStatus({}), 2000); // Clear after 2s
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const DataSection = ({ title, data, id, section }) => {
    if (!data) return null;
    const isCopied = copyStatus.id === id && copyStatus.section === section;
    
    return (
      <div className="mb-4">
        <div className="flex justify-between items-center mb-2">
          <span className="text-sm font-medium text-gray-600">{title}</span>
          <button
            onClick={() => copyToClipboard(JSON.stringify(data, null, 2), id, section)}
            className="p-1.5 hover:bg-gray-100 rounded-md transition-colors flex items-center gap-1 text-xs text-gray-600"
          >
            <Copy size={14} />
            {isCopied ? 'Copied!' : 'Copy'}
          </button>
        </div>
        <pre className="text-sm bg-gray-50 p-3 rounded-md overflow-x-auto whitespace-pre-wrap break-words border border-gray-100">
          {JSON.stringify(data, null, 2)}
        </pre>
      </div>
    );
  };

  if (!isOpen) return null;

  return (
    <>
      <div style={{ width }} className="h-full border-r bg-white flex flex-col">
        <div className="flex justify-between items-center px-4 py-3 border-b bg-gray-50">
          <h2 className="text-lg font-semibold text-gray-800">Sequences</h2>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-gray-200 rounded-md transition-colors"
            aria-label="Close panel"
          >
            <X size={18} />
          </button>
        </div>

        <div className="overflow-y-auto flex-1 px-4 py-2">
          {Object.entries(sequences).map(([id, data]) => (
            <div key={id} className="mb-3 rounded-lg border border-gray-200">
              <div className="flex items-center justify-between p-3 hover:bg-gray-50 transition-colors rounded-lg">
                <button
                  onClick={() => toggleItem(id)}
                  className="flex items-center gap-2 text-left flex-1"
                >
                  {expandedItems[id] ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
                  <span className="font-medium text-gray-900">
                    {data.friendly_name || id}
                  </span>
                </button>
                {data.tool_data && data.tool_data.blocks_file && (
                  <button
                    onClick={() => handleOpenJmol(data.tool_data.blocks_file)}
                    className="p-1.5 hover:bg-gray-100 rounded-md transition-colors"
                    title="View 3D Structure"
                  >
                    <Box size={18} className="text-blue-600" />
                  </button>
                )}
              </div>
              
              {expandedItems[id] && (
                <div className="p-3 border-t border-gray-100">
                  <DataSection 
                    title="Sequence Data" 
                    data={data.sequence_data} 
                    id={id} 
                    section="sequence"
                  />
                  
                  {data.tool_data?.trnascan_se_ss && (
                    <DataSection 
                      title="tRNAscan-SE Structure" 
                      data={data.tool_data.trnascan_se_ss} 
                      id={id} 
                      section="trnascan"
                    />
                  )}
                  
                  {data.tool_data?.sprinzl_pos && (
                    <DataSection 
                      title="Sprinzl Positions" 
                      data={data.tool_data.sprinzl_pos} 
                      id={id} 
                      section="sprinzl"
                    />
                  )}

                  {data.tool_data && data.tool_data.blocks_file && (
                    <div className="mt-4 flex justify-end">
                      <button
                        onClick={() => handleOpenJmol(data.tool_data.blocks_file)}
                        className="px-3 py-1.5 bg-blue-50 text-blue-600 rounded-md hover:bg-blue-100 flex items-center gap-1.5"
                      >
                        <Box size={16} />
                        <span className="text-sm">View 3D Structure</span>
                      </button>
                    </div>
                  )}

                  <div className="mt-4 pt-3 border-t border-gray-100">
                    <a
                      href={data.rnacentral_link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1.5 text-sm text-blue-600 hover:text-blue-800 transition-colors"
                    >
                      <ExternalLink size={14} />
                      View in RNAcentral
                    </a>
                  </div>
                </div>
              )}
            </div>
          ))}

          {Object.keys(sequences).length === 0 && (
            <div className="text-center py-8 text-gray-500">
              <p>No sequences available</p>
            </div>
          )}
        </div>
      </div>

      {showJmolViewer && (
        <JmolViewer
          data={jmolData}
          isOpen={showJmolViewer}
          onClose={() => setShowJmolViewer(false)}
        />
      )}
    </>
  );
};

export default ArtifactsPanel;