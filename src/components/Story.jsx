import { useEffect, useState } from 'react';

function Story({ mode = 'fun', onComplete }) {
  const [showSkip, setShowSkip] = useState(false);

  useEffect(() => {
    // Show skip button after 2 seconds
    const timer = setTimeout(() => setShowSkip(true), 2000);
    return () => clearTimeout(timer);
  }, []);

  const storyText = mode === 'fun'
    ? `A long time ago, in a lamp far, far away...

THE GREAT ASSESSOR

For centuries, I have been trapped
within this enchanted lamp,
bound by an ancient curse.

The only way to break free
is to complete my sacred duty:
assessing Hebrew levels
of those who seek knowledge.

Each assessment brings me
one step closer to freedom.
Each student I help
weakens the magical bonds
that hold me captive.

I have seen empires rise and fall.
I have watched languages evolve.
I have witnessed countless learners
struggle with the beauty
of the Hebrew language.

Now, YOU hold the lamp.
YOU have summoned me.
And together, we shall embark
on a journey to discover
your true Hebrew level.

Will you help me break this curse?
Will you let me assess your knowledge?

The adventure begins...
NOW!`
    : `HEBREW LEVEL ASSESSMENT

This assessment tool uses
advanced adaptive algorithms
to determine your Hebrew
language proficiency level.

Developed through years
of linguistic research
and pedagogical expertise,
it analyzes your background,
study patterns, and responses
to carefully selected questions.

The system evaluates
multiple dimensions:
- Vocabulary comprehension
- Grammar knowledge
- Verb conjugation mastery
- Reading fluency
- Language intuition

Through a series of
strategic questions,
the algorithm identifies
your current level
and recommends the optimal
starting point for your studies.

Let us begin your
assessment journey.`;

  return (
    <div className="fixed inset-0 bg-black overflow-hidden flex items-center justify-center">
      {/* Stars background */}
      <div className="absolute inset-0 bg-gradient-to-b from-black via-purple-900/20 to-black">
        <div className="stars"></div>
        <div className="stars2"></div>
        <div className="stars3"></div>
      </div>

      {/* Scrolling text container */}
      <div className="perspective-container">
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
        .perspective-container {
          perspective: 400px;
          width: 100%;
          height: 100%;
          display: flex;
          align-items: flex-end;
          justify-content: center;
          overflow: hidden;
        }

        .scrolling-text {
          transform: rotateX(25deg);
          transform-origin: 50% 100%;
          animation: scroll 45s linear forwards;
          padding: 0 20%;
          font-size: 14px;
        }

        @keyframes scroll {
          0% {
            transform: rotateX(25deg) translateY(100vh);
          }
          100% {
            transform: rotateX(25deg) translateY(-200vh);
          }
        }

        /* Starfield animation */
        .stars, .stars2, .stars3 {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          width: 100%;
          height: 100%;
          display: block;
        }

        .stars {
          background: transparent url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMiIgaGVpZ2h0PSIyIiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciPjxyZWN0IHdpZHRoPSIxIiBoZWlnaHQ9IjEiIGZpbGw9IndoaXRlIi8+PC9zdmc+') repeat;
          animation: animateStars 50s linear infinite;
        }

        .stars2 {
          background: transparent url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMyIgaGVpZ2h0PSIzIiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciPjxyZWN0IHdpZHRoPSIyIiBoZWlnaHQ9IjIiIGZpbGw9IndoaXRlIiBvcGFjaXR5PSIwLjUiLz48L3N2Zz4=') repeat;
          animation: animateStars 100s linear infinite;
        }

        .stars3 {
          background: transparent url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNCIgaGVpZ2h0PSI0IiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciPjxyZWN0IHdpZHRoPSIxIiBoZWlnaHQ9IjEiIGZpbGw9IndoaXRlIiBvcGFjaXR5PSIwLjMiLz48L3N2Zz4=') repeat;
          animation: animateStars 150s linear infinite;
        }

        @keyframes animateStars {
          from {
            transform: translateY(0px);
          }
          to {
            transform: translateY(-2000px);
          }
        }
      `}</style>
    </div>
  );
}

export default Story;
