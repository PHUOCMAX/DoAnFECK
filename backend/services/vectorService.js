import { GoogleGenAI } from "@google/genai";
import { QdrantClient } from "@qdrant/js-client-rest";

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

const EMBEDDING_MODEL =
  process.env.GEMINI_EMBEDDING_MODEL ||
  "gemini-embedding-2";

const QDRANT_HOST =
  process.env.QDRANT_HOST ||
  "localhost";

const QDRANT_PORT = Number(
  process.env.QDRANT_PORT || 6333
);

const COLLECTION_NAME =
  process.env.QDRANT_COLLECTION ||
  "tour_guide_pois";

const ai = new GoogleGenAI({
  apiKey: GEMINI_API_KEY,
});

const qdrant = new QdrantClient({
  host: QDRANT_HOST,
  port: QDRANT_PORT,
});

/* =========================================================
   EMBEDDING
========================================================= */

async function createEmbedding(text) {
  if (!GEMINI_API_KEY) {
    throw new Error(
      "GEMINI_API_KEY chưa được cấu hình."
    );
  }

  const cleanText =
    String(text || "").trim();

  if (!cleanText) {
    throw new Error(
      "Không thể tạo embedding từ text rỗng."
    );
  }

  const response =
    await ai.models.embedContent({
      model: EMBEDDING_MODEL,
      contents: cleanText,
    });

  const vector =
    response?.embeddings?.[0]?.values;

  if (
    !Array.isArray(vector) ||
    vector.length === 0
  ) {
    throw new Error(
      "Gemini không trả về embedding hợp lệ."
    );
  }

  return vector;
}

/* =========================================================
   COLLECTION
========================================================= */

async function ensureCollection() {
  const collections =
    await qdrant.getCollections();

  const exists =
    collections.collections?.some(
      (collection) =>
        collection.name ===
        COLLECTION_NAME
    );

  if (exists) {
    return;
  }

  const testVector =
    await createEmbedding("test");

  await qdrant.createCollection(
    COLLECTION_NAME,
    {
      vectors: {
        size: testVector.length,
        distance: "Cosine",
      },
    }
  );

  console.log(
    `[Vector] Created collection: ${COLLECTION_NAME}`
  );
}

/* =========================================================
   TEXT
========================================================= */

function buildPoiText(poi) {
  return [
    `Tên tiếng Việt: ${
      poi.name_vi || ""
    }`,

    `Tên tiếng Anh: ${
      poi.name_en || ""
    }`,

    `Tên tiếng Trung: ${
      poi.name_zh || ""
    }`,

    `Mô tả tiếng Việt: ${
      poi.description_vi || ""
    }`,

    `Mô tả tiếng Anh: ${
      poi.description_en || ""
    }`,

    `Mô tả tiếng Trung: ${
      poi.description_zh || ""
    }`,

    `Thành phố: ${
      poi.city || ""
    }`,

    `Danh mục: ${
      poi.category || ""
    }`,
  ].join("\n");
}

/* =========================================================
   INDEX / UPSERT POI
========================================================= */

export async function indexPoi(poi) {
  if (!poi?.id) {
    throw new Error(
      "POI không có id."
    );
  }

  await ensureCollection();

  const text =
    buildPoiText(poi);

  const vector =
    await createEmbedding(text);

  const status =
    poi.status || "approved";

  await qdrant.upsert(
    COLLECTION_NAME,
    {
      points: [
        {
          id: Number(poi.id),

          vector,

          payload: {
            poi_id: Number(poi.id),

            status,

            name_vi:
              poi.name_vi || "",

            name_en:
              poi.name_en || "",

            name_zh:
              poi.name_zh || "",

            description_vi:
              poi.description_vi || "",

            description_en:
              poi.description_en || "",

            description_zh:
              poi.description_zh || "",

            city:
              poi.city || "",

            category:
              poi.category || "",

            latitude:
              poi.latitude ?? null,

            longitude:
              poi.longitude ?? null,

            radius:
              poi.radius ?? null,

            image:
              poi.image || null,

            text,
          },
        },
      ],
    }
  );

  return {
    id: Number(poi.id),

    status,

    indexed: true,
  };
}

/* =========================================================
   SEARCH SIMILAR POIS
   CHỈ LẤY APPROVED
========================================================= */

export async function searchSimilarPois(
  question,
  limit = 5
) {
  await ensureCollection();

  const vector =
    await createEmbedding(question);

  const result =
    await qdrant.query(
      COLLECTION_NAME,
      {
        query: vector,

        limit: Number(limit),

        with_payload: true,

        filter: {
          must: [
            {
              key: "status",

              match: {
                value: "approved",
              },
            },
          ],
        },
      }
    );

  return (
    result?.points || []
  ).map((point) => ({
    score: point.score,

    ...(point.payload || {}),
  }));
}

/* =========================================================
   DELETE POI VECTOR
========================================================= */

export async function deletePoiVector(
  poiId
) {
  const id = Number(poiId);

  if (
    !Number.isInteger(id) ||
    id < 1
  ) {
    throw new Error(
      "POI ID không hợp lệ."
    );
  }

  const collections =
    await qdrant.getCollections();

  const exists =
    collections.collections?.some(
      (collection) =>
        collection.name ===
        COLLECTION_NAME
    );

  if (!exists) {
    console.log(
      `[Vector] Collection ${COLLECTION_NAME} chưa tồn tại.`
    );

    return {
      id,
      deleted: false,
      reason:
        "collection_not_found",
    };
  }

  await qdrant.delete(
    COLLECTION_NAME,
    {
      points: [id],
      wait: true,
    }
  );

  console.log(
    `[Vector] Deleted POI #${id} from Qdrant.`
  );

  return {
    id,
    deleted: true,
  };
}

/* =========================================================
   DELETE COLLECTION
========================================================= */

export async function clearPoiCollection() {
  const collections =
    await qdrant.getCollections();

  const exists =
    collections.collections?.some(
      (collection) =>
        collection.name ===
        COLLECTION_NAME
    );

  if (!exists) {
    return;
  }

  await qdrant.deleteCollection(
    COLLECTION_NAME
  );

  console.log(
    `[Vector] Deleted collection: ${COLLECTION_NAME}`
  );
}

/* =========================================================
   STATUS
========================================================= */

export async function getVectorStatus() {
  try {
    const collections =
      await qdrant.getCollections();

    return {
      connected: true,

      collection:
        COLLECTION_NAME,

      collections:
        collections.collections?.map(
          (item) => item.name
        ) || [],
    };
  } catch (error) {
    return {
      connected: false,

      collection:
        COLLECTION_NAME,

      collections: [],

      error:
        error?.message ||
        "Không thể kết nối Qdrant.",
    };
  }
}