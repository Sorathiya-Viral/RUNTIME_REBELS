import { connectDB, disconnectDB } from '../config/db.js';
import { InstitutionSettings } from '../models/InstitutionSettings.js';
import { Programme } from '../models/Programme.js';
import { Faculty } from '../models/Faculty.js';
import { Room } from '../models/Room.js';
import { Subject } from '../models/Subject.js';
import { generateTimetableSchedule } from '../scheduler/solver.js';
import { logger } from '../utils/logger.js';

async function testImpossibleScenario() {
  try {
    await connectDB();
    logger.info('--- RUNNING INTENTIONALLY IMPOSSIBLE SCHEDULING SCENARIO ---');

    const [settings, programme, facultyList] = await Promise.all([
      InstitutionSettings.findOne(),
      Programme.findOne({ code: 'M.Sc. DFIS' }),
      Faculty.find({ isActive: true }),
    ]);

    // Intentionally create impossible resource configuration:
    // Only 1 lecture hall, and ZERO laboratories!
    const roomsWithoutLabs = [
      {
        roomNumber: 'CR-101',
        name: 'Single Small Lecture Hall',
        roomType: 'lecture_hall',
        capacity: 50,
        isActive: true,
        isAvailable: true,
      },
    ];

    // Subject requiring laboratory practical
    const subjects = await Subject.find({
      programmeCode: 'M.Sc. DFIS',
      subjectType: 'practical',
    }).populate('primaryFaculty');

    logger.info(`Testing with ${subjects.length} practical lab subjects but ZERO available laboratories...`);

    const result = await generateTimetableSchedule({
      institutionSettings: settings.toObject(),
      programme: programme.toObject(),
      semesterNumber: 1,
      subjects: subjects.map((s) => s.toObject()),
      facultyList: facultyList.map((f) => f.toObject()),
      rooms: roomsWithoutLabs,
    });

    logger.info(`Solver Success Status: ${result.success} (Expected: false)`);
    logger.info(`Diagnostics Status: ${result.diagnostics.status}`);
    logger.info(`Conflict Messages:`, result.diagnostics.conflictMessages);
    logger.info(`Actionable Suggestions:`, result.diagnostics.suggestions);

    if (!result.success && result.diagnostics.status === 'infeasible') {
      logger.info('✅ VERIFIED: Solver honestly reported infeasibility without claiming false success!');
    } else {
      logger.error('❌ FAILED: Solver should have reported infeasibility.');
    }
  } catch (error) {
    logger.error('Error during impossible scenario run:', error);
  } finally {
    await disconnectDB();
  }
}

testImpossibleScenario();
