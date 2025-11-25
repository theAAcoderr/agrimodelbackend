const axios = require('axios');

// Test the approval endpoints
async function testApprovalEndpoints() {
  const baseURL = 'http://localhost:3001/api';
  
  try {
    console.log('🧪 Testing Approval Endpoints...\n');
    
    // First, let's get a pending submission to test with
    console.log('1. Fetching pending submissions...');
    const submissionsResponse = await axios.get(`${baseURL}/data-submissions?status=pending`);
    const submissions = submissionsResponse.data;
    
    if (submissions.length === 0) {
      console.log('❌ No pending submissions found. Please submit some data first.');
      return;
    }
    
    const testSubmission = submissions[0];
    console.log(`✅ Found submission: ${testSubmission.id}`);
    console.log(`   Status: ${testSubmission.status}`);
    console.log(`   Student: ${testSubmission.student_id}\n`);
    
    // Test approval endpoint
    console.log('2. Testing approval endpoint...');
    try {
      const approveResponse = await axios.patch(`${baseURL}/data-submissions/${testSubmission.id}/approve`, {
        reviewedBy: 'test-reviewer-id'
      });
      
      console.log('✅ Approval successful!');
      console.log(`   New status: ${approveResponse.data.status}`);
      console.log(`   Reviewed by: ${approveResponse.data.reviewed_by}`);
      console.log(`   Reviewed at: ${approveResponse.data.reviewed_at}\n`);
      
      // Test rejecting the same submission (should fail since it's already approved)
      console.log('3. Testing rejection of approved submission (should fail)...');
      try {
        await axios.patch(`${baseURL}/data-submissions/${testSubmission.id}/reject`, {
          reviewedBy: 'test-reviewer-id',
          rejectionReason: 'Test rejection'
        });
        console.log('❌ This should have failed!');
      } catch (error) {
        console.log('✅ Correctly rejected already-reviewed submission');
        console.log(`   Error: ${error.response?.data?.error || error.message}\n`);
      }
      
    } catch (error) {
      console.log('❌ Approval failed:');
      console.log(`   Error: ${error.response?.data?.error || error.message}\n`);
    }
    
    // Test with a fresh pending submission for rejection
    if (submissions.length > 1) {
      const rejectTestSubmission = submissions[1];
      console.log('4. Testing rejection endpoint...');
      
      try {
        const rejectResponse = await axios.patch(`${baseURL}/data-submissions/${rejectTestSubmission.id}/reject`, {
          reviewedBy: 'test-reviewer-id',
          rejectionReason: 'Test rejection reason'
        });
        
        console.log('✅ Rejection successful!');
        console.log(`   New status: ${rejectResponse.data.status}`);
        console.log(`   Rejection reason: ${rejectResponse.data.rejection_reason}`);
        console.log(`   Reviewed by: ${rejectResponse.data.reviewed_by}\n`);
        
      } catch (error) {
        console.log('❌ Rejection failed:');
        console.log(`   Error: ${error.response?.data?.error || error.message}\n`);
      }
    }
    
    // Test error cases
    console.log('5. Testing error cases...');
    
    // Test approval with non-existent submission
    try {
      await axios.patch(`${baseURL}/data-submissions/non-existent-id/approve`, {
        reviewedBy: 'test-reviewer-id'
      });
      console.log('❌ This should have failed!');
    } catch (error) {
      console.log('✅ Correctly handled non-existent submission');
      console.log(`   Error: ${error.response?.data?.error || error.message}\n`);
    }
    
    // Test rejection without reason
    if (submissions.length > 2) {
      const noReasonSubmission = submissions[2];
      try {
        await axios.patch(`${baseURL}/data-submissions/${noReasonSubmission.id}/reject`, {
          reviewedBy: 'test-reviewer-id'
          // No rejectionReason provided
        });
        console.log('❌ This should have failed!');
      } catch (error) {
        console.log('✅ Correctly rejected submission without reason');
        console.log(`   Error: ${error.response?.data?.error || error.message}\n`);
      }
    }
    
    console.log('🎉 All tests completed!');
    
  } catch (error) {
    console.error('❌ Test setup failed:', error.message);
    if (error.response) {
      console.error('Response data:', error.response.data);
    }
  }
}

// Run the tests
testApprovalEndpoints();
