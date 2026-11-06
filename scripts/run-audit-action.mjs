async function main() {
  const payload = {
    action: 'EXECUTE_AUDIT_PARTS_2_3_4_FIX',
    payload: {
      linkProjectClientIdAndSupervisorId: true,
      decoupleEmbeddedJobPositionFromUsers: true,
      linkCostMatrixToProjectItemId: true,
      standardizeProjectServiceAndCategoryIds: true,
      standardizeUserDepartmentsWithIds: true,
      standardizeUserCertificationsWithIds: true,
      standardizeWarehouseShelvesAndLocations: true,
      standardizePaymentTermsAndStcSystems: true,
      cleanHeavyBase64FromCostMatrix: true
    }
  };

  const response = await fetch('https://us-central1-inteckno-erp.cloudfunctions.net/aiApi/api/v1/ai/action', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-API-Key': 'Inteckno_Master_2026_Segura!'
    },
    body: JSON.stringify(payload)
  });

  const text = await response.text();
  console.log('HTTP Status:', response.status);
  console.log('Response body:', text);
}

main().catch(console.error);
