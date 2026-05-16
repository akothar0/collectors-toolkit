import assert from 'node:assert/strict';
import { test } from 'node:test';
import { normalizePSACertBody } from '../src/lib/cert-lookup/psa';

test('normalizePSACertBody maps live PSA card payload', () => {
  const result = normalizePSACertBody('113364366', {
    PSACert: {
      CertNumber: '113364366',
      SpecID: 2659809,
      Year: '2016',
      Brand: 'PANINI SELECT EMERGING STAR SIGNATURES',
      Category: 'SOCCER CARDS',
      CardNumber: 'ES-CP',
      Subject: 'CHRISTIAN PULISIC',
      Variety: 'EMERGING STAR SIGNATURE',
      IsPSADNA: false,
      IsDualCert: false,
      GradeDescription: 'MINT 9',
      CardGrade: 'MINT 9',
      TotalPopulation: 32,
      TotalPopulationWithQualifier: 0,
      PopulationHigher: 4,
      ItemStatus: 'Y',
    },
  });

  assert.deepEqual(result, {
    certNumber: '113364366',
    psaSpecId: '2659809',
    player: 'CHRISTIAN PULISIC',
    year: 2016,
    manufacturer: 'PANINI SELECT EMERGING STAR SIGNATURES',
    sport: 'SOCCER CARDS',
    cardNumber: 'ES-CP',
    parallel: 'EMERGING STAR SIGNATURE',
    grade: 9,
    gradeDescription: 'MINT 9',
    qualifierCode: null,
    autographGrade: null,
    popAtGrade: 32,
    popWithQualifier: 0,
    popHigher: 4,
    isDualCert: false,
    source: 'psa_api',
  });
});

test('normalizePSACertBody returns null for invalid or DNA certs', () => {
  assert.equal(
    normalizePSACertBody('123', {
      PSACert: {
        ItemStatus: 'N',
        IsPSADNA: false,
      },
    }),
    null
  );

  assert.equal(
    normalizePSACertBody('123', {
      PSACert: {
        ItemStatus: 'Y',
        IsPSADNA: true,
      },
    }),
    null
  );
});
