const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://jyhmhksdpjkzkhqlkuqh.supabase.co';
const supabaseKey = 'sb_publishable_a0zC2QDTxicG-HbxojKkTQ_medLD1JW';

const supabase = createClient(supabaseUrl, supabaseKey);

async function addTestDoc() {
  const { error } = await supabase
    .from('documents')
    .insert({
      filename: '测试文档',
      content: '# 欢迎使用3D打印工艺手册\n\n这是测试文档内容。',
      category: 'process',
      uploader: 'admin'
    });

  if (error) {
    console.error('Error:', error.message);
  } else {
    console.log('Success: Document added');
  }
}

addTestDoc();