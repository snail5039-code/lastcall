export type HospitalImage = {
  imageUrl: string;
  sourceUrl: string;
  author: string;
  license: string;
};

type CommonsMetadata = {
  value?: string;
};

type CommonsPage = {
  title?: string;
  canonicalurl?: string;
  imageinfo?: {
    thumburl?: string;
    descriptionurl?: string;
    extmetadata?: {
      Artist?: CommonsMetadata;
      Credit?: CommonsMetadata;
      LicenseShortName?: CommonsMetadata;
      UsageTerms?: CommonsMetadata;
    };
  }[];
};

type CommonsResponse = {
  query?: {
    pages?: CommonsPage[];
  };
};

const ALLOWED_LICENSES = [
  "cc0",
  "public domain",
  "cc by",
  "cc-by",
  "cc by-sa",
  "cc-by-sa",
];

const normalize = (value: string) =>
  value
    .normalize("NFKC")
    .toLowerCase()
    .replace(/\.(jpe?g|png|webp)$/i, "")
    .replace(/[^a-z0-9가-힣]/g, "");

const stripHtml = (value?: string) =>
  (value ?? "")
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;|&#160;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/\s+/g, " ")
    .trim();

const isAllowedLicense = (license: string) => {
  const normalized = license.toLowerCase();
  return (
    ALLOWED_LICENSES.some((allowed) => normalized.includes(allowed)) &&
    !normalized.includes("noncommercial") &&
    !normalized.includes("nc")
  );
};

const toHospitalImage = (
  page: CommonsPage,
  hospitalName: string
): HospitalImage | null => {
  const title = page.title?.replace(/^File:/i, "") ?? "";
  if (!normalize(title).includes(normalize(hospitalName))) {
    return null;
  }

  const imageInfo = page.imageinfo?.[0];
  const metadata = imageInfo?.extmetadata;
  const license = stripHtml(
    metadata?.LicenseShortName?.value ?? metadata?.UsageTerms?.value
  );

  if (!imageInfo?.thumburl || !license || !isAllowedLicense(license)) {
    return null;
  }

  return {
    imageUrl: imageInfo.thumburl,
    sourceUrl:
      page.canonicalurl ??
      imageInfo.descriptionurl ??
      "https://commons.wikimedia.org/",
    author:
      stripHtml(metadata?.Artist?.value ?? metadata?.Credit?.value) ||
      "Wikimedia Commons 기여자",
    license,
  };
};

const fetchCommons = async (
  params: Record<string, string>,
  signal: AbortSignal
) => {
  const query = new URLSearchParams({
    action: "query",
    format: "json",
    formatversion: "2",
    origin: "*",
    prop: "imageinfo|info",
    inprop: "url",
    iiprop: "url|extmetadata",
    iiurlwidth: "1200",
    ...params,
  });
  const response = await fetch(
    `https://commons.wikimedia.org/w/api.php?${query.toString()}`,
    { signal }
  );
  if (!response.ok) {
    throw new Error(`Commons image request failed: ${response.status}`);
  }
  return (await response.json()) as CommonsResponse;
};

export async function findOpenHospitalImage({
  hospitalName,
  address,
  latitude,
  longitude,
}: {
  hospitalName: string;
  address: string;
  latitude?: number;
  longitude?: number;
}): Promise<HospitalImage | null> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 7000);

  try {
    const hasCoordinates =
      Number.isFinite(latitude) &&
      Number.isFinite(longitude) &&
      latitude !== 0 &&
      longitude !== 0;

    if (hasCoordinates) {
      const nearby = await fetchCommons(
        {
          generator: "geosearch",
          ggsprimary: "all",
          ggsnamespace: "6",
          ggsradius: "3000",
          ggslimit: "20",
          ggscoord: `${latitude}|${longitude}`,
        },
        controller.signal
      );
      const nearbyMatch = nearby.query?.pages
        ?.map((page) => toHospitalImage(page, hospitalName))
        .find((image): image is HospitalImage => image !== null);
      if (nearbyMatch) {
        return nearbyMatch;
      }
    }

    const addressHint = address.split(" ").slice(0, 3).join(" ");
    const searched = await fetchCommons(
      {
        generator: "search",
        gsrnamespace: "6",
        gsrlimit: "10",
        gsrsearch: `"${hospitalName}" ${addressHint} filetype:bitmap`,
      },
      controller.signal
    );
    return (
      searched.query?.pages
        ?.map((page) => toHospitalImage(page, hospitalName))
        .find((image): image is HospitalImage => image !== null) ?? null
    );
  } catch (error) {
    if (error instanceof Error && error.name !== "AbortError") {
      console.log("공개 라이선스 병원 이미지 조회 실패:", error.message);
    }
    return null;
  } finally {
    clearTimeout(timeout);
  }
}
