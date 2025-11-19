import { useEffect, useState } from 'react';

function Story({ mode = 'fun', onComplete }) {
  const [showSkip, setShowSkip] = useState(false);

  useEffect(() => {
    // Show skip button after 2 seconds
    const timer = setTimeout(() => setShowSkip(true), 2000);
    return () => clearTimeout(timer);
  }, []);

  const storyText = `

























THE LEGEND OF THE GREAT ASSESSOR



In the vibrant streets of Tel Aviv
stands ULPAN BAYIT,
a renowned private Hebrew ulpan,
famous throughout Israel
for bringing together
immersion, modernity, and culture.

More than just a language school,
Ulpan Bayit is a cultural hub,
a meeting place for learners
from around the world,
a teachers training facility,
and a top advancer
of Hebrew teaching in Israel.

At the heart of this institution
lies a secret power:
the ability to create
perfectly homogenous classes,
with students at the exact same level.

This is no small feat.
This is the foundation
of motivating, effective learning.
This is what makes
the difference between
struggling and thriving.

For years, the founder,
YARON SIVAN,
perfected the art
of level assessment.

He developed an uncanny ability
to determine a person's true level
after hearing just
10 sentences or less.

His methods were refined,
his intuition was sharp,
his assessments were legendary.

Now, all of that expertise,
all of those tricks and insights,
have been distilled
into this magical assessment.

And the genie you see before you?
He is Yaron's alter ego,
his mystical manifestation,
ready to discover YOUR true level
and guide you to your perfect class.

The assessment begins...
NOW!`;

  return (
    <div className="fixed inset-0 bg-black overflow-hidden flex items-center justify-center">
      {/* Scrolling text container */}
      <div className="scroll-container">
        <div className="scrolling-text">
          <pre className="font-pixel text-yellow-300 text-center leading-loose whitespace-pre-wrap">
            {storyText}
          </pre>
        </div>
      </div>

      {/* Skip button */}
      {showSkip && (
        <button
          onClick={onComplete}
          className="
            fixed bottom-8 right-8
            bg-purple-500/80 hover:bg-purple-600
            text-white font-pixel text-xs
            px-6 py-3 border-4 border-purple-700
            shadow-pixel-lg active:translate-y-1 active:shadow-pixel
            transition-all duration-200
            animate-pulse
          "
        >
          SKIP
        </button>
      )}

      <style>{`
        .scroll-container {
          width: 100%;
          height: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          overflow: hidden;
        }

        .scrolling-text {
          animation: scroll 90s linear forwards;
          padding: 0 10%;
          font-size: clamp(16px, 3vw, 32px);
        }

        @keyframes scroll {
          0% {
            transform: translateY(100vh);
          }
          100% {
            transform: translateY(-100%);
          }
        }
      `}</style>
    </div>
  );
}

export default Story;
