import { ClaudeModel, claudeService } from './claude';

// Function to check for new Claude models (could be called periodically)
export async function checkForNewModels(): Promise<ClaudeModel[]> {
  try {
    // This could fetch from Anthropic's API or a model registry
    // For now, we'll simulate checking for updates
    const response = await fetch('/api/claude/models');
    const data = await response.json();
    
    if (data.models) {
      return data.models;
    }
    
    return [];
  } catch (error) {
    console.error('Error checking for new models:', error);
    return [];
  }
}

// Function to update models automatically
export async function updateModelsAutomatically(): Promise<boolean> {
  try {
    const newModels = await checkForNewModels();
    
    if (newModels.length > 0) {
      const response = await fetch('/api/claude/models', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          models: newModels,
          updateType: 'automatic'
        }),
      });
      
      const result = await response.json();
      return result.success || false;
    }
    
    return false;
  } catch (error) {
    console.error('Error updating models automatically:', error);
    return false;
  }
}

// Function to get the latest model info
export async function getLatestModelInfo(): Promise<ClaudeModel | null> {
  try {
    const response = await fetch('/api/claude/models');
    const data = await response.json();
    
    return data.latestModel || null;
  } catch (error) {
    console.error('Error getting latest model info:', error);
    return null;
  }
}

// Scheduled model update (could be called by a cron job or webhook)
export async function scheduledModelUpdate(): Promise<void> {
  console.log('Checking for Claude model updates...');
  
  const updated = await updateModelsAutomatically();
  
  if (updated) {
    console.log('Claude models updated successfully');
  } else {
    console.log('No new Claude models available');
  }
} 