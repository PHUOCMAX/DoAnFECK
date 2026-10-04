import "dotenv/config";

import pool from "../config/db.js";
import { indexPoi } from "../services/vectorService.js";

async function main() {
  console.log("=================================");
  console.log("INDEX POIS → QDRANT");
  console.log("=================================");

  try {
    const [pois] = await pool.query(`
      SELECT
        id,
        name_vi,
        name_en,
        name_zh,
        description_vi,
        description_en,
        description_zh,
        city,
        category,
        latitude,
        longitude,
        radius,
        image,
        status
      FROM pois
      WHERE status = 'approved'
      ORDER BY id ASC
    `);

    if (!Array.isArray(pois) || pois.length === 0) {
      console.log("Không có POI approved để index.");
      return;
    }

    console.log(
      `Tìm thấy ${pois.length} POI approved.`
    );

    let success = 0;
    let failed = 0;

    for (const poi of pois) {
      try {
        console.log(
          `\n[${success + failed + 1}/${pois.length}] Index POI #${poi.id}`
        );

        console.log(
          `Tên: ${poi.name_vi || "Không có tên"}`
        );

        await indexPoi(poi);

        success += 1;

        console.log("✓ Indexed");
      } catch (error) {
        failed += 1;

        console.error(
          `✗ Failed POI #${poi.id}:`,
          error?.message || error
        );
      }
    }

    console.log("\n=================================");
    console.log("KẾT QUẢ");
    console.log("=================================");
    console.log(`Tổng: ${pois.length}`);
    console.log(`Thành công: ${success}`);
    console.log(`Thất bại: ${failed}`);

    if (failed > 0) {
      console.log(
        "\nCó POI chưa được index. Kiểm tra log phía trên."
      );
    } else {
      console.log(
        "\n✓ Tất cả POI đã được đưa vào Qdrant."
      );
    }
  } catch (error) {
    console.error(
      "\nINDEX POIS ERROR:",
      error?.message || error
    );

    process.exitCode = 1;
  } finally {
    await pool.end();
  }
}

main();