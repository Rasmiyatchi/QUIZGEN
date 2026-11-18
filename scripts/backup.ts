import fs from 'node:fs';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';

/**
 * QUIZGEN v3 — SQLite Ma'lumotlar bazasini xavfsiz zaxiralash (Backup & Integrity)
 */
export function createDatabaseBackup(dbPath = './data/quizgen.db', backupDir = './data/backups', retentionDays = 14): {
  success: boolean;
  backupFile?: string;
  integrityOk: boolean;
  message: string;
} {
  try {
    if (!fs.existsSync(dbPath)) {
      return { success: false, integrityOk: false, message: `Asosiy baza fayli topilmadi: ${dbPath}` };
    }

    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true });
    }

    // 1. Asosiy bazaning yaxlitligini tekshirish (PRAGMA integrity_check)
    const db = new DatabaseSync(dbPath);
    const integrityRow = db.prepare('PRAGMA integrity_check').get() as any;
    db.close();

    const integrityOk = integrityRow && integrityRow.integrity_check === 'ok';
    if (!integrityOk) {
      return {
        success: false,
        integrityOk: false,
        message: `Ma'lumotlar bazasi yaxlitlik tekshiruvidan o'tmadi: ${JSON.stringify(integrityRow)}`
      };
    }

    // 2. Vaqt tamg'asi bilan nusxa yaratish
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupFileName = `quizgen_backup_${timestamp}.db`;
    const targetPath = path.join(backupDir, backupFileName);

    // SQLite WAL rejimida bo'lsa, xavfsiz nusxalash
    fs.copyFileSync(dbPath, targetPath);

    // Agar WAL yoki SHM fayllari bo'lsa, ularni ham nusxalaymiz
    if (fs.existsSync(`${dbPath}-wal`)) {
      fs.copyFileSync(`${dbPath}-wal`, `${targetPath}-wal`);
    }
    if (fs.existsSync(`${dbPath}-shm`)) {
      fs.copyFileSync(`${dbPath}-shm`, `${targetPath}-shm`);
    }

    // 3. Eski zaxira nusxalarini tozalash (Retention policy)
    const now = Date.now();
    const maxAgeMs = retentionDays * 24 * 60 * 60 * 1000;
    const files = fs.readdirSync(backupDir);

    for (const f of files) {
      if (f.startsWith('quizgen_backup_') && f.endsWith('.db')) {
        const filePath = path.join(backupDir, f);
        const stat = fs.statSync(filePath);
        if (now - stat.mtimeMs > maxAgeMs) {
          fs.unlinkSync(filePath);
          if (fs.existsSync(`${filePath}-wal`)) fs.unlinkSync(`${filePath}-wal`);
          if (fs.existsSync(`${filePath}-shm`)) fs.unlinkSync(`${filePath}-shm`);
        }
      }
    }

    return {
      success: true,
      backupFile: targetPath,
      integrityOk: true,
      message: `Zaxira muvaffaqiyatli yaratildi: ${backupFileName}`
    };
  } catch (err: any) {
    return {
      success: false,
      integrityOk: false,
      message: `Zaxira yaratishda xatolik: ${err.message}`
    };
  }
}

// CLI orqali to'g'ridan-to'g'ri ishga tushirilganda
if (process.argv[1] && process.argv[1].endsWith('backup.ts')) {
  console.log("Ma'lumotlar bazasini zaxiralash boshlandi...");
  const res = createDatabaseBackup();
  console.log(res.message);
  process.exit(res.success ? 0 : 1);
}
