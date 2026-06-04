import { trackResultsAction } from '../lib/supabase';

function CourseSelectionModal({ isOpen, onClose, recommendedLevel, assessmentId }) {
  if (!isOpen) return null;

  // Extract the level code from the full level name
  // E.g., "Aleph (A1.1)" -> "a-1-1", "Bet (A2.1)" -> "a-2-1"
  const getLevelCode = (levelName) => {
    const match = levelName.match(/\(([^)]+)\)/);
    if (!match) return 'a-1-1';

    // Extract pattern like "A1.1" or "B2.1"
    const parts = match[1].match(/([A-Z])(\d)\.(\d)/);
    if (!parts) return 'a-1-1';

    // Convert to "a-1-1" format
    const letter = parts[1].toLowerCase();
    const num1 = parts[2];
    const num2 = parts[3];

    return `${letter}-${num1}-${num2}`;
  };

  const levelCode = getLevelCode(recommendedLevel);
  // ulpan.co.il has no /course/b-1-1/ or /course/b-2-1/ page (Gimmel B1.1, Dalet
  // B2.1) — both 404. Map them to the generic level page ('Gimmel' / 'Dalet');
  // online Gimmel -> o-b-1, online Dalet -> the online-courses hub (no o-b-2).
  const inPersonSlug = ({ 'b-1-1': 'b-1', 'b-2-1': 'b-2' })[levelCode] || levelCode;
  const onlineSlug = ({ 'b-1-1': 'o-b-1', 'b-2-1': 'online-courses' })[levelCode] || `o-${levelCode}`;

  const handleInPerson = () => {
    trackResultsAction(assessmentId, 'select_course_type', { courseType: 'in_person', level: recommendedLevel });
    window.open(`https://ulpan.co.il/course/${inPersonSlug}/`, '_blank');
    onClose();
  };

  const handleOnline = () => {
    trackResultsAction(assessmentId, 'select_course_type', { courseType: 'online', level: recommendedLevel });
    window.open(`https://ulpan.co.il/course/${onlineSlug}/`, '_blank');
    onClose();
  };

  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
      onClick={handleBackdropClick}
    >
      <div className="bg-purple-100 border-8 border-purple-900 shadow-pixel-lg max-w-2xl w-full">
        {/* Header */}
        <div className="bg-purple-600 border-b-8 border-purple-900 p-6 flex justify-between items-center">
          <h2 className="text-3xl font-bold text-white">Choose Course Type</h2>
          <button
            onClick={onClose}
            className="bg-red-500 hover:bg-red-600 text-white font-bold px-4 py-2 border-4 border-red-700 shadow-pixel-sm active:translate-y-1 active:shadow-none transition-all"
          >
            ✕
          </button>
        </div>

        {/* Content */}
        <div className="p-8">
          <div className="space-y-6">
            <p className="text-xl text-purple-900 text-center font-semibold mb-8">
              How would you like to study?
            </p>

            {/* In Person Option */}
            <button
              onClick={handleInPerson}
              className="w-full bg-purple-500 hover:bg-purple-600 text-white text-xl font-bold px-8 py-6 border-4 border-purple-700 shadow-pixel active:translate-y-1 active:shadow-pixel-sm transition-all"
            >
              🏫 In Person
            </button>

            {/* Online Option */}
            <button
              onClick={handleOnline}
              className="w-full bg-blue-500 hover:bg-blue-600 text-white text-xl font-bold px-8 py-6 border-4 border-blue-700 shadow-pixel active:translate-y-1 active:shadow-pixel-sm transition-all"
            >
              💻 Online
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default CourseSelectionModal;
