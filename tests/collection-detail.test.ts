import assert from 'node:assert/strict';
import test from 'node:test';
import {
  COLLECTION_CARD_DETAIL_SELECT,
  detailToFormValues,
  formValuesToPayload,
  mapCollectionDetailRow,
  type CollectionCardDetail,
} from '../src/lib/collection-detail';

test('COLLECTION_CARD_DETAIL_SELECT disambiguates import_items FK', () => {
  assert.match(COLLECTION_CARD_DETAIL_SELECT, /import_items!import_item_id/);
  assert.doesNotMatch(COLLECTION_CARD_DETAIL_SELECT, /import_items \(/);
});

test('mapCollectionDetailRow maps catalog overrides and provenance', () => {
  const row = {
    id: 'cc-1',
    card_id: 'card-1',
    front_image_url: 'https://example.com/front.jpg',
    back_image_url: null,
    override_player: 'Override Player',
    override_year: 2020,
    override_set_name: 'Topps',
    override_parallel: null,
    override_card_number: '1',
    sport: 'Baseball',
    condition_type: 'graded',
    grade: 10,
    grade_description: null,
    qualifier_code: null,
    grading_company: 'PSA',
    cert_number: '12345678',
    autograph_grade: null,
    sub_grades: null,
    notes: 'Mint',
    purchase_price: 100,
    purchase_date: '2024-01-15',
    purchase_source: 'eBay',
    purchase_url: null,
    current_value: 150,
    value_updated_at: '2024-06-01T00:00:00Z',
    value_source: 'manual',
    status: 'owned',
    scan_id: 'scan-1',
    grade_session_id: 'grade-1',
    import_item_id: 'import-1',
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-06-01T00:00:00Z',
    cards: {
      id: 'card-1',
      player: 'Catalog Player',
      year: 2019,
      set_name: 'Catalog Set',
      card_number: '99',
      parallel: 'Refractor',
      sport: 'Baseball',
      is_rookie: true,
      is_autograph: false,
    },
    graded_scans: {
      id: 'scan-1',
      created_at: '2024-01-02T00:00:00Z',
      cert_number: '12345678',
      grading_company: 'PSA',
    },
    raw_grade_sessions: {
      id: 'grade-1',
      created_at: '2024-01-03T00:00:00Z',
      predicted_grade: 9.5,
      confidence: 'high',
    },
    import_items: {
      id: 'import-1',
      created_at: '2024-01-04T00:00:00Z',
      raw_source: 'Card Ladder CSV',
    },
  };

  const detail = mapCollectionDetailRow(row);

  assert.equal(detail.id, 'cc-1');
  assert.equal(detail.player, 'Override Player');
  assert.equal(detail.year, 2020);
  assert.equal(detail.setName, 'Topps');
  assert.equal(detail.catalog?.player, 'Catalog Player');
  assert.equal(detail.scanSession?.id, 'scan-1');
  assert.equal(detail.gradeSession?.predictedGrade, 9.5);
  assert.equal(detail.importItem?.rawSource, 'Card Ladder CSV');
});

test('mapCollectionDetailRow normalizes array joins from PostgREST', () => {
  const detail = mapCollectionDetailRow({
    id: 'cc-2',
    card_id: null,
    front_image_url: null,
    back_image_url: null,
    override_player: null,
    override_year: null,
    override_set_name: null,
    override_parallel: null,
    override_card_number: null,
    sport: null,
    condition_type: 'raw',
    grade: null,
    grade_description: null,
    qualifier_code: null,
    grading_company: null,
    cert_number: null,
    autograph_grade: null,
    sub_grades: null,
    notes: null,
    purchase_price: null,
    purchase_date: null,
    purchase_source: null,
    purchase_url: null,
    current_value: null,
    value_updated_at: null,
    value_source: null,
    status: 'owned',
    scan_id: null,
    grade_session_id: null,
    import_item_id: null,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
    cards: [],
    graded_scans: [],
    raw_grade_sessions: [],
    import_items: [],
  });

  assert.equal(detail.catalog, null);
  assert.equal(detail.scanSession, null);
  assert.equal(detail.gradeSession, null);
  assert.equal(detail.importItem, null);
});

function sampleDetail(overrides: Partial<CollectionCardDetail> = {}): CollectionCardDetail {
  return {
    id: 'cc-1',
    cardId: 'card-1',
    frontImageUrl: null,
    backImageUrl: null,
    player: 'Mike Trout',
    year: 2011,
    setName: 'Topps Update',
    parallel: null,
    cardNumber: 'US175',
    sport: 'Baseball',
    conditionType: 'graded',
    grade: 10,
    gradeDescription: null,
    qualifierCode: null,
    gradingCompany: 'PSA',
    certNumber: '12345678',
    autographGrade: null,
    subGrades: null,
    notes: '',
    purchasePrice: 500,
    purchaseDate: '2024-01-01',
    purchaseSource: 'Show',
    purchaseUrl: null,
    currentValue: 750,
    valueUpdatedAt: '2024-06-01',
    valueSource: 'manual',
    status: 'owned',
    scanId: null,
    gradeSessionId: null,
    importItemId: null,
    createdAt: '2024-01-01',
    updatedAt: '2024-06-01',
    catalog: {
      id: 'card-1',
      player: 'Mike Trout',
      year: 2011,
      setName: 'Topps Update',
      cardNumber: 'US175',
      parallel: null,
      sport: 'Baseball',
      isRookie: true,
      isAutograph: false,
    },
    scanSession: null,
    gradeSession: null,
    importItem: null,
    ...overrides,
  };
}

test('detailToFormValues and formValuesToPayload round-trip graded card', () => {
  const detail = sampleDetail();
  const form = detailToFormValues(detail);
  const payload = formValuesToPayload(form);

  assert.equal(form.player, 'Mike Trout');
  assert.equal(form.gradingCompany, 'PSA');
  assert.equal(payload.conditionType, 'graded');
  assert.equal(payload.gradingCompany, 'PSA');
  assert.equal(payload.grade, 10);
  assert.equal(payload.purchasePrice, 500);
});

test('detailToFormValues maps unknown grading company to Other', () => {
  const form = detailToFormValues(sampleDetail({ gradingCompany: 'HGA' }));
  assert.equal(form.gradingCompany, 'Other');
  assert.equal(form.gradingCompanyOther, 'HGA');
});
