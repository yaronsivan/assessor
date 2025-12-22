import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

// Simple bar chart component
function BarChart({ data, title, colorClass = 'bg-purple-500' }) {
  const maxValue = Math.max(...data.map(d => d.value), 1);

  return (
    <div className="bg-white/10 border-4 border-white/20 p-4">
      <h3 className="font-pixel text-white text-sm mb-4">{title}</h3>
      <div className="space-y-2">
        {data.map((item, i) => (
          <div key={i} className="flex items-center gap-2">
            <div className="w-24 text-xs text-white/80 truncate" title={item.label}>
              {item.label}
            </div>
            <div className="flex-1 h-6 bg-white/10 relative">
              <div
                className={`h-full ${colorClass} transition-all duration-500`}
                style={{ width: `${(item.value / maxValue) * 100}%` }}
              />
              <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-white font-bold">
                {item.value} {item.percent && `(${item.percent}%)`}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// Stat card component
function StatCard({ label, value, subtext, colorClass = 'text-white' }) {
  return (
    <div className="bg-white/10 border-4 border-white/20 p-4 text-center">
      <div className={`font-pixel text-2xl ${colorClass}`}>{value}</div>
      <div className="text-white/80 text-sm mt-1">{label}</div>
      {subtext && <div className="text-white/60 text-xs mt-1">{subtext}</div>}
    </div>
  );
}

// Funnel visualization
function FunnelChart({ data }) {
  const maxValue = data[0]?.value || 1;

  return (
    <div className="bg-white/10 border-4 border-white/20 p-4">
      <h3 className="font-pixel text-white text-sm mb-4">Conversion Funnel</h3>
      <div className="space-y-1">
        {data.map((stage, i) => {
          const width = (stage.value / maxValue) * 100;
          const dropoff = i > 0 ? data[i-1].value - stage.value : 0;
          const dropoffPercent = i > 0 ? ((dropoff / data[i-1].value) * 100).toFixed(1) : 0;

          return (
            <div key={i}>
              <div
                className="h-10 bg-gradient-to-r from-purple-600 to-purple-400 flex items-center justify-between px-3 mx-auto transition-all duration-500"
                style={{ width: `${Math.max(width, 20)}%` }}
              >
                <span className="text-white text-xs font-bold truncate">{stage.label}</span>
                <span className="text-white text-xs font-bold">{stage.value}</span>
              </div>
              {dropoff > 0 && (
                <div className="text-center text-red-400 text-xs py-1">
                  ↓ {dropoff} dropped ({dropoffPercent}%)
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// Question performance table
function QuestionPerformance({ questions }) {
  if (!questions.length) return null;

  return (
    <div className="bg-white/10 border-4 border-white/20 p-4">
      <h3 className="font-pixel text-white text-sm mb-4">Question Performance (Hardest Questions)</h3>
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="text-white/60 border-b border-white/20">
              <th className="text-left p-2">Level</th>
              <th className="text-left p-2">Question</th>
              <th className="text-right p-2">Correct</th>
              <th className="text-right p-2">Wrong</th>
              <th className="text-right p-2">Rate</th>
            </tr>
          </thead>
          <tbody>
            {questions.slice(0, 15).map((q, i) => (
              <tr key={i} className="border-b border-white/10 text-white/80">
                <td className="p-2 text-purple-300">{q.level}</td>
                <td className="p-2 max-w-xs truncate" dir="rtl" title={q.question}>
                  {q.question}
                </td>
                <td className="p-2 text-right text-green-400">{q.correct}</td>
                <td className="p-2 text-right text-red-400">{q.wrong}</td>
                <td className="p-2 text-right">
                  <span className={q.successRate < 50 ? 'text-red-400' : 'text-green-400'}>
                    {q.successRate}%
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default function Stats() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [stats, setStats] = useState(null);
  const [dateRange, setDateRange] = useState('all'); // all, 7d, 30d

  useEffect(() => {
    fetchStats();
  }, [dateRange]);

  async function fetchStats() {
    setLoading(true);
    setError(null);

    try {
      // Build date filter
      let dateFilter = null;
      if (dateRange === '7d') {
        dateFilter = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
      } else if (dateRange === '30d') {
        dateFilter = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
      }

      // Fetch all assessments
      let query = supabase.from('assessments').select('*');
      if (dateFilter) {
        query = query.gte('created_at', dateFilter);
      }

      const { data: assessments, error: fetchError } = await query;

      if (fetchError) throw fetchError;

      // Calculate all stats
      const calculated = calculateStats(assessments || []);
      setStats(calculated);
    } catch (err) {
      console.error('Failed to fetch stats:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  function calculateStats(assessments) {
    const total = assessments.length;
    if (total === 0) {
      return { total: 0, empty: true };
    }

    // 1. Funnel Analysis
    const surveyStarts = assessments.filter(a => a.current_stage).length;
    const gameStarts = assessments.filter(a => ['game', 'completed'].includes(a.current_stage)).length;
    const completed = assessments.filter(a => a.current_stage === 'completed').length;

    const funnel = [
      { label: 'Started Survey', value: surveyStarts },
      { label: 'Started Game', value: gameStarts },
      { label: 'Completed', value: completed }
    ];

    // 2. Completion Rate
    const completionRate = total > 0 ? ((completed / total) * 100).toFixed(1) : 0;

    // 3. Level Distribution
    const levelCounts = {};
    assessments.filter(a => a.recommended_level).forEach(a => {
      levelCounts[a.recommended_level] = (levelCounts[a.recommended_level] || 0) + 1;
    });

    const levelOrder = [
      'Aleph (A1.1)', 'Aleph+ (A1.2)', 'Aleph++ (A1.3)',
      'Bet (A2.1)', 'Bet+ (A2.2)', 'Bet++ (A2.3)',
      'Gimmel (B1.1)', 'Gimmel+ (B1.2)', 'Gimmel++ (B1.3)',
      'Dalet (B2.1)'
    ];

    const levelDistribution = levelOrder
      .filter(level => levelCounts[level])
      .map(level => ({
        label: level.split(' ')[0],
        value: levelCounts[level],
        percent: ((levelCounts[level] / completed) * 100).toFixed(1)
      }));

    // 4. Geographic Distribution
    const countryCounts = {};
    assessments.filter(a => a.geo_country).forEach(a => {
      countryCounts[a.geo_country] = (countryCounts[a.geo_country] || 0) + 1;
    });

    const geoDistribution = Object.entries(countryCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([country, count]) => ({
        label: country,
        value: count,
        percent: ((count / total) * 100).toFixed(1)
      }));

    // 5. Device Distribution
    const deviceCounts = {};
    assessments.filter(a => a.device_type).forEach(a => {
      deviceCounts[a.device_type] = (deviceCounts[a.device_type] || 0) + 1;
    });

    const deviceDistribution = Object.entries(deviceCounts)
      .sort((a, b) => b[1] - a[1])
      .map(([device, count]) => ({
        label: device.charAt(0).toUpperCase() + device.slice(1),
        value: count,
        percent: ((count / total) * 100).toFixed(1)
      }));

    // 6. Abandonment Analysis
    const abandonedAtSurvey = assessments.filter(a => a.current_stage === 'survey').length;
    const abandonedAtGame = assessments.filter(a => a.current_stage === 'game').length;

    const abandonmentData = [
      { label: 'At Survey', value: abandonedAtSurvey, percent: ((abandonedAtSurvey / total) * 100).toFixed(1) },
      { label: 'During Game', value: abandonedAtGame, percent: ((abandonedAtGame / total) * 100).toFixed(1) },
      { label: 'Completed', value: completed, percent: completionRate }
    ];

    // 7. Time Metrics
    const completedWithDuration = assessments.filter(a => a.duration_seconds && a.current_stage === 'completed');
    const avgDuration = completedWithDuration.length > 0
      ? Math.round(completedWithDuration.reduce((sum, a) => sum + a.duration_seconds, 0) / completedWithDuration.length)
      : 0;

    const completedWithResultsTime = assessments.filter(a => a.time_on_results_seconds);
    const avgResultsTime = completedWithResultsTime.length > 0
      ? Math.round(completedWithResultsTime.reduce((sum, a) => sum + a.time_on_results_seconds, 0) / completedWithResultsTime.length)
      : 0;

    // 8. Questions Asked Distribution
    const questionsDistribution = {};
    assessments.filter(a => a.total_questions_asked).forEach(a => {
      const count = a.total_questions_asked;
      questionsDistribution[count] = (questionsDistribution[count] || 0) + 1;
    });

    const avgQuestions = completedWithDuration.length > 0
      ? (assessments.filter(a => a.total_questions_asked).reduce((sum, a) => sum + a.total_questions_asked, 0) /
         assessments.filter(a => a.total_questions_asked).length).toFixed(1)
      : 0;

    // 9. Conversion Actions
    const viewedCourses = assessments.filter(a => a.clicked_view_courses).length;
    const scheduledAssessment = assessments.filter(a => a.clicked_schedule_assessment).length;
    const courseTypeOnline = assessments.filter(a => a.clicked_course_type === 'online').length;
    const courseTypeInPerson = assessments.filter(a => a.clicked_course_type === 'in-person').length;

    // 10. Question Performance Analysis
    const questionStats = {};
    assessments.forEach(a => {
      if (!a.question_history || !Array.isArray(a.question_history)) return;

      a.question_history.forEach(q => {
        const key = `${q.level}|${q.questionText}`;
        if (!questionStats[key]) {
          questionStats[key] = { level: q.level, question: q.questionText, correct: 0, wrong: 0 };
        }
        if (q.isCorrect) {
          questionStats[key].correct++;
        } else {
          questionStats[key].wrong++;
        }
      });
    });

    const questionPerformance = Object.values(questionStats)
      .map(q => ({
        ...q,
        total: q.correct + q.wrong,
        successRate: Math.round((q.correct / (q.correct + q.wrong)) * 100)
      }))
      .filter(q => q.total >= 5) // Only show questions asked 5+ times
      .sort((a, b) => a.successRate - b.successRate); // Hardest first

    // 11. Knowledge Source Distribution
    const sourceCounts = {};
    assessments.filter(a => a.knowledge_source).forEach(a => {
      sourceCounts[a.knowledge_source] = (sourceCounts[a.knowledge_source] || 0) + 1;
    });

    const sourceDistribution = Object.entries(sourceCounts)
      .sort((a, b) => b[1] - a[1])
      .map(([source, count]) => ({
        label: source,
        value: count,
        percent: ((count / total) * 100).toFixed(1)
      }));

    // 12. Daily Activity (last 30 days)
    const dailyCounts = {};
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    assessments
      .filter(a => new Date(a.created_at) >= thirtyDaysAgo)
      .forEach(a => {
        const date = new Date(a.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        dailyCounts[date] = (dailyCounts[date] || 0) + 1;
      });

    const dailyActivity = Object.entries(dailyCounts)
      .slice(-14) // Last 14 days
      .map(([date, count]) => ({ label: date, value: count }));

    // 13. Beyond Max Level
    const beyondMax = assessments.filter(a => a.beyond_max_level).length;

    // 14. Extreme Beginners (finished level is "—")
    const extremeBeginners = assessments.filter(a => a.finished_level === '—').length;

    return {
      total,
      completed,
      completionRate,
      funnel,
      levelDistribution,
      geoDistribution,
      deviceDistribution,
      abandonmentData,
      avgDuration,
      avgResultsTime,
      avgQuestions,
      viewedCourses,
      scheduledAssessment,
      courseTypeOnline,
      courseTypeInPerson,
      questionPerformance,
      sourceDistribution,
      dailyActivity,
      beyondMax,
      extremeBeginners
    };
  }

  function formatDuration(seconds) {
    if (!seconds) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 flex items-center justify-center">
        <div className="text-white font-pixel text-xl animate-pulse">Loading stats...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 flex items-center justify-center">
        <div className="text-red-400 font-pixel text-xl">Error: {error}</div>
      </div>
    );
  }

  if (!stats || stats.empty) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 flex items-center justify-center">
        <div className="text-white/60 font-pixel text-xl">No data available</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 p-4 md:p-8">
      {/* Header */}
      <div className="max-w-7xl mx-auto mb-8">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="font-pixel text-white text-xl md:text-2xl">Genie Analytics</h1>
            <p className="text-white/60 text-sm mt-1">Assessment performance dashboard</p>
          </div>

          {/* Date Range Filter */}
          <div className="flex gap-2">
            {[
              { value: 'all', label: 'All Time' },
              { value: '30d', label: 'Last 30d' },
              { value: '7d', label: 'Last 7d' }
            ].map(option => (
              <button
                key={option.value}
                onClick={() => setDateRange(option.value)}
                className={`px-4 py-2 text-sm font-bold border-4 transition-all ${
                  dateRange === option.value
                    ? 'bg-purple-500 border-purple-700 text-white'
                    : 'bg-white/10 border-white/20 text-white/80 hover:bg-white/20'
                }`}
              >
                {option.label}
              </button>
            ))}
            <button
              onClick={fetchStats}
              className="px-4 py-2 text-sm font-bold bg-green-600 border-4 border-green-800 text-white hover:bg-green-500"
            >
              Refresh
            </button>
          </div>
        </div>
      </div>

      {/* Key Metrics Row */}
      <div className="max-w-7xl mx-auto grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 mb-8">
        <StatCard
          label="Total Sessions"
          value={stats.total}
        />
        <StatCard
          label="Completed"
          value={stats.completed}
          subtext={`${stats.completionRate}% rate`}
          colorClass="text-green-400"
        />
        <StatCard
          label="Avg Duration"
          value={formatDuration(stats.avgDuration)}
          subtext="start to finish"
        />
        <StatCard
          label="Avg Questions"
          value={stats.avgQuestions}
          subtext="per assessment"
        />
        <StatCard
          label="Viewed Courses"
          value={stats.viewedCourses}
          subtext={`${((stats.viewedCourses / stats.completed) * 100 || 0).toFixed(1)}% of completed`}
          colorClass="text-blue-400"
        />
        <StatCard
          label="Booked Assessment"
          value={stats.scheduledAssessment}
          subtext={`${((stats.scheduledAssessment / stats.completed) * 100 || 0).toFixed(1)}% of completed`}
          colorClass="text-yellow-400"
        />
      </div>

      {/* Main Content Grid */}
      <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Funnel */}
        <FunnelChart data={stats.funnel} />

        {/* Level Distribution */}
        <BarChart
          data={stats.levelDistribution}
          title="Recommended Level Distribution"
          colorClass="bg-gradient-to-r from-green-500 to-green-400"
        />

        {/* Geographic */}
        <BarChart
          data={stats.geoDistribution}
          title="Top Countries"
          colorClass="bg-gradient-to-r from-blue-500 to-blue-400"
        />

        {/* Devices */}
        <BarChart
          data={stats.deviceDistribution}
          title="Device Types"
          colorClass="bg-gradient-to-r from-yellow-500 to-yellow-400"
        />

        {/* Knowledge Source */}
        <BarChart
          data={stats.sourceDistribution}
          title="Hebrew Knowledge Source"
          colorClass="bg-gradient-to-r from-pink-500 to-pink-400"
        />

        {/* Abandonment */}
        <BarChart
          data={stats.abandonmentData}
          title="Session Outcomes"
          colorClass="bg-gradient-to-r from-red-500 to-orange-400"
        />

        {/* Daily Activity */}
        {stats.dailyActivity.length > 0 && (
          <BarChart
            data={stats.dailyActivity}
            title="Daily Sessions (Last 14 Days)"
            colorClass="bg-gradient-to-r from-cyan-500 to-cyan-400"
          />
        )}

        {/* Special Cases */}
        <div className="bg-white/10 border-4 border-white/20 p-4">
          <h3 className="font-pixel text-white text-sm mb-4">Special Cases</h3>
          <div className="grid grid-cols-2 gap-4">
            <div className="text-center p-4 bg-white/5 border-2 border-white/10">
              <div className="text-2xl font-bold text-purple-400">{stats.beyondMax}</div>
              <div className="text-xs text-white/60 mt-1">Beyond Max Level (B2.1+)</div>
            </div>
            <div className="text-center p-4 bg-white/5 border-2 border-white/10">
              <div className="text-2xl font-bold text-orange-400">{stats.extremeBeginners}</div>
              <div className="text-xs text-white/60 mt-1">Extreme Beginners</div>
            </div>
            <div className="text-center p-4 bg-white/5 border-2 border-white/10">
              <div className="text-2xl font-bold text-blue-400">{stats.courseTypeOnline}</div>
              <div className="text-xs text-white/60 mt-1">Chose Online Course</div>
            </div>
            <div className="text-center p-4 bg-white/5 border-2 border-white/10">
              <div className="text-2xl font-bold text-green-400">{stats.courseTypeInPerson}</div>
              <div className="text-xs text-white/60 mt-1">Chose In-Person</div>
            </div>
          </div>
        </div>
      </div>

      {/* Question Performance - Full Width */}
      <div className="max-w-7xl mx-auto mt-6">
        <QuestionPerformance questions={stats.questionPerformance} />
      </div>

      {/* Insights Section */}
      <div className="max-w-7xl mx-auto mt-6">
        <div className="bg-white/10 border-4 border-white/20 p-4">
          <h3 className="font-pixel text-white text-sm mb-4">Key Insights</h3>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4 text-sm text-white/80">
            <div className="p-3 bg-white/5 border-2 border-white/10">
              <span className="text-yellow-400 font-bold">Completion Rate:</span>{' '}
              {stats.completionRate >= 70 ? (
                <span className="text-green-400">Excellent ({stats.completionRate}%)</span>
              ) : stats.completionRate >= 50 ? (
                <span className="text-yellow-400">Good ({stats.completionRate}%)</span>
              ) : (
                <span className="text-red-400">Needs attention ({stats.completionRate}%)</span>
              )}
            </div>

            <div className="p-3 bg-white/5 border-2 border-white/10">
              <span className="text-yellow-400 font-bold">Main Drop-off:</span>{' '}
              {stats.abandonmentData[0]?.value > stats.abandonmentData[1]?.value
                ? 'Survey stage - consider simplifying survey'
                : 'During game - questions may be too difficult'}
            </div>

            <div className="p-3 bg-white/5 border-2 border-white/10">
              <span className="text-yellow-400 font-bold">Avg Time on Results:</span>{' '}
              {formatDuration(stats.avgResultsTime)} -
              {stats.avgResultsTime > 60 ? ' Users are engaging well' : ' Consider making results more engaging'}
            </div>

            <div className="p-3 bg-white/5 border-2 border-white/10">
              <span className="text-yellow-400 font-bold">Course Interest Rate:</span>{' '}
              {((stats.viewedCourses / stats.completed) * 100 || 0).toFixed(1)}% viewed courses after completing
            </div>

            <div className="p-3 bg-white/5 border-2 border-white/10">
              <span className="text-yellow-400 font-bold">Booking Rate:</span>{' '}
              {((stats.scheduledAssessment / stats.completed) * 100 || 0).toFixed(1)}% scheduled in-person assessment
            </div>

            <div className="p-3 bg-white/5 border-2 border-white/10">
              <span className="text-yellow-400 font-bold">Course Preference:</span>{' '}
              {stats.courseTypeOnline > stats.courseTypeInPerson
                ? `Online preferred (${stats.courseTypeOnline} vs ${stats.courseTypeInPerson})`
                : `In-person preferred (${stats.courseTypeInPerson} vs ${stats.courseTypeOnline})`}
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="max-w-7xl mx-auto mt-8 text-center space-y-2">
        <a
          href="/"
          className="inline-block px-4 py-2 text-sm font-bold bg-white/10 border-4 border-white/20 text-white/80 hover:bg-white/20"
        >
          ← Back to App
        </a>
        <p className="text-white/40 text-xs">
          DEV MODE ONLY - This page is not accessible in production
        </p>
      </div>
    </div>
  );
}
