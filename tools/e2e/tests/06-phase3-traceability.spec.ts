/**
 * T-3.7 — Phase 3 E2E: Snapshots, Plan lock with auto-snapshot, Coverage Matrix export.
 * Requires: ADO_CLOUD_ORG_URL, ADO_CLOUD_PROJECT, ADO_CLOUD_PAT env vars.
 * Each test is self-contained and cleans up after itself.
 */
import { exportMatrixToExcel, exportMatrixToPdf } from "@atconseil/testvault-exporters";
import { buildCoverageMatrix } from "@atconseil/testvault-sdk";
import { expect, test } from "../fixtures/index.js";

test.describe("Phase 3 — Traceability & Versioning", () => {
	test("create snapshot, list snapshots, verify immutability", async ({
		tcService,
		versionService,
		project,
	}) => {
		const uid = Date.now();
		const tc = await tcService.create({
			title: `E2E Snapshot TC ${uid}`,
			areaPath: project,
		});

		try {
			// Create a snapshot
			const snap = await versionService.createSnapshot(tc, {
				name: `snap-${uid}`,
				parentTestCaseId: tc.id,
			});
			expect(snap.id).toBeGreaterThan(0);
			expect(snap.name).toBe(`snap-${uid}`);
			expect(snap.snapshotTitle).toBe(tc.title);
			expect(snap.immutable).toBe(true);

			// List snapshots — should include the one just created
			const list = await versionService.listSnapshots(tc.id);
			expect(list.some((s) => s.id === snap.id)).toBe(true);

			// Duplicate name must throw SnapshotNameConflictError
			const { SnapshotNameConflictError } = await import("@atconseil/testvault-sdk");
			await expect(
				versionService.createSnapshot(tc, { name: `snap-${uid}`, parentTestCaseId: tc.id })
			).rejects.toThrow(SnapshotNameConflictError);
		} finally {
			await tcService.delete(tc.id);
		}
	});

	test("lockWithAutoSnapshot creates one snapshot per TC and stores IDs", async ({
		tcService,
		setService,
		planService,
		versionService,
		project,
	}) => {
		const uid = Date.now();
		const tc = await tcService.create({ title: `E2E LockSnap TC ${uid}`, areaPath: project });
		const set = await setService.create({ name: `E2E LockSnap Set ${uid}`, areaPath: project });
		await setService.addTestCases(set.id, [tc.id]);
		const plan = await planService.create({
			name: `E2E LockSnap Plan ${uid}`,
			owner: "e2e@example.com",
			testSetIds: [set.id],
		});

		try {
			const locked = await planService.lockWithAutoSnapshot(plan.id, {
				testSetService: setService,
				fetchTestCase: (id) => tcService.read(id),
				versionService,
			});
			expect(locked.state).toBe("Locked");
			expect(locked.lockedSnapshotIds).toBeDefined();
			expect(locked.lockedSnapshotIds?.length).toBeGreaterThan(0);

			// Verify snapshot exists
			const snaps = await versionService.listSnapshots(tc.id);
			const autoSnap = snaps.find((s) => s.name === `auto-lock-${plan.id}-${tc.id}`);
			expect(autoSnap).toBeDefined();
		} finally {
			await planService.delete(plan.id);
			await setService.delete(set.id);
			await tcService.delete(tc.id);
		}
	});

	test("buildCoverageMatrix + exportMatrixToExcel produces a valid XLSX buffer", async ({
		tcService,
		project,
	}) => {
		const uid = Date.now();
		const tc = await tcService.create({ title: `E2E Matrix TC ${uid}`, areaPath: project });

		try {
			const matrix = buildCoverageMatrix({
				workItems: [{ id: 9000, title: "US-E2E" }],
				testCases: [{ id: tc.id, title: tc.title }],
				links: [{ workItemId: 9000, testCaseId: tc.id }],
				executions: [],
			});

			expect(matrix.rows).toHaveLength(1);
			expect(matrix.columns).toHaveLength(1);

			const buf = exportMatrixToExcel(matrix);
			expect(buf).toBeInstanceOf(ArrayBuffer);
			expect(buf.byteLength).toBeGreaterThan(0);
			// PK magic bytes (ZIP/XLSX)
			const view = new Uint8Array(buf);
			expect(view[0]).toBe(0x50);
			expect(view[1]).toBe(0x4b);

			const html = exportMatrixToPdf(matrix);
			expect(html).toContain("US-E2E");
			expect(html).toContain(tc.title);
		} finally {
			await tcService.delete(tc.id);
		}
	});
});
