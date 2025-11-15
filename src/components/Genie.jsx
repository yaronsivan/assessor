import { useState, useEffect } from 'react';
import genieImage from '../assets/genie yaron.png';

function Genie({ animated = false }) {
  const [genieEntered, setGenieEntered] = useState(false);

  useEffect(() => {
    const genieTimer = setTimeout(() => setGenieEntered(true), 100);

    return () => {
      clearTimeout(genieTimer);
    };
  }, []);

  return (
    <div className="flex flex-col items-center justify-start h-full overflow-hidden pt-4">
      {/* Entrance animation wrapper */}
      <div
        className="transition-transform duration-[1500ms] ease-out"
        style={{
          transform: genieEntered ? 'translateY(0)' : 'translateY(calc(100vh + 200px))',
          opacity: genieEntered ? 1 : 0
        }}
      >
        {/* Hover float animation wrapper */}
        <div
          className={`relative ${genieEntered ? 'genie-hover' : ''}`}
          style={genieEntered ? { animationDelay: '1.6s' } : undefined}
        >
          {/* Genie Image - larger when animated */}
          <img
            src={genieImage}
            alt="Assessor the Genie"
            className={animated ? "w-[1400px] h-auto filter drop-shadow-2xl" : "w-[1024px] h-auto filter drop-shadow-2xl"}
          />

          {/* Shadow below genie */}
          <div className={`absolute -bottom-4 left-1/2 transform -translate-x-1/2 w-64 h-8 bg-purple-900/30 rounded-full blur-2xl ${animated ? 'animate-pulse' : ''}`} />
        </div>
      </div>
    </div>
  );
}

export default Genie;
