import { NextRequest, NextResponse } from 'next/server';
import { verifyUser } from '@/lib/auth/verifyUser';
import { rateLimit } from '@/lib/auth/rateLimit';

// F-114 (웹 버전): Google Fit REST API — 걸음 수 / 활동 데이터
// Google Fit OAuth scope: https://www.googleapis.com/auth/fitness.activity.read

interface FitDataPoint {
  startTimeNanos: string;
  endTimeNanos: string;
  value: { intVal?: number; fpVal?: number }[];
}

interface FitBucket {
  dataset: { dataSourceId: string; point: FitDataPoint[] }[];
}

export async function POST(req: NextRequest) {
  const uid = await verifyUser(req);
  if (!uid) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!rateLimit(`${uid}:google-fit`, 20, 60_000)) {
    return NextResponse.json({ error: 'Too Many Requests' }, { status: 429 });
  }

  const { accessToken, days = 7 } = await req.json() as {
    accessToken: string;
    days?: number;
  };

  if (!accessToken) {
    return NextResponse.json({ error: 'accessToken 필수' }, { status: 400 });
  }

  const endTime = Date.now();
  const startTime = endTime - days * 24 * 60 * 60 * 1000;

  // Google Fit Aggregate API
  const fitRes = await fetch(
    'https://www.googleapis.com/fitness/v1/users/me/dataset:aggregate',
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        aggregateBy: [
          { dataTypeName: 'com.google.step_count.delta' },
          { dataTypeName: 'com.google.calories.expended' },
          { dataTypeName: 'com.google.active_minutes' },
        ],
        bucketByTime: { durationMillis: 86400000 }, // 1일 단위
        startTimeMillis: startTime,
        endTimeMillis: endTime,
      }),
    }
  );

  if (!fitRes.ok) {
    const err = await fitRes.text();
    return NextResponse.json({ error: 'google_fit_failed', detail: err }, { status: 502 });
  }

  const fitData = await fitRes.json() as { bucket: FitBucket[] };

  const dailyStats = fitData.bucket.map((bucket, i) => {
    const date = new Date(startTime + i * 86400000).toISOString().split('T')[0];

    let steps = 0;
    let calories = 0;
    let activeMinutes = 0;

    for (const ds of bucket.dataset) {
      for (const point of ds.point) {
        const val = point.value[0];
        if (!val) continue;
        const num = val.intVal ?? val.fpVal ?? 0;

        if (ds.dataSourceId.includes('step_count')) steps += num;
        else if (ds.dataSourceId.includes('calories')) calories += Math.round(num);
        else if (ds.dataSourceId.includes('active_minutes')) activeMinutes += num;
      }
    }

    return { date, steps, calories, activeMinutes };
  });

  const totalSteps = dailyStats.reduce((s, d) => s + d.steps, 0);
  const avgSteps = Math.round(totalSteps / days);

  return NextResponse.json({
    summary: { totalSteps, avgSteps, days },
    daily: dailyStats,
  });
}
