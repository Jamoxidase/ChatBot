import React from 'react';

const ArtifactList = ({ artifacts, fullResultsUrl }) => {
  if (!artifacts || artifacts.length === 0) {
    return <div className="artifact-list">No artifacts to display</div>;
  }

  return (
    <div className="artifact-list">
      <h2 className="text-xl font-bold mb-4">tRNA Sequences</h2>
      {fullResultsUrl && (
        <a 
          href={fullResultsUrl} 
          target="_blank" 
          rel="noopener noreferrer" 
          className="text-blue-500 hover:text-blue-700 mb-4 block"
        >
          View Full Results
        </a>
      )}
      {artifacts.map((artifact, index) => (
        <div key={index} className="artifact-item mb-4 p-4 border rounded shadow-sm">
          <h3 className="font-semibold">
            <a 
              href={`https://rnacentral.org/rna/${artifact.rnacentral_id}`} 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-blue-500 hover:text-blue-700"
            >
              {artifact.rnacentral_id}
            </a>
          </h3>
          <p><strong>Sequence:</strong> <span className="break-all">{artifact.sequence}</span></p>
          <p><strong>Length:</strong> {artifact.length}</p>
          <p><strong>Description:</strong> {artifact.description}</p>
        </div>
      ))}
    </div>
  );
};

export default ArtifactList;