// Cost Monitoring & Auto-Scaling Service
// Monitors usage and suggests/triggers scaling

class ScalingService {
  constructor() {
    this.currentPhase = process.env.DEPLOYMENT_PHASE || 'demo';
    this.costThreshold = parseFloat(process.env.COST_ALERT_THRESHOLD) || 50;
    this.usageMetrics = {
      users: 0,
      storageUsed: 0,
      aiCalls: 0,
      monthlyCost: 0
    };
    
    this.phases = {
      demo: {
        maxUsers: 100,
        maxStorage: 1024 * 1024 * 1024,      // 1GB total
        maxAICalls: 1000,                     // 1000 AI calls/month
        estimatedCost: 0
      },
      growth: {
        maxUsers: 1000,
        maxStorage: 100 * 1024 * 1024 * 1024, // 100GB total
        maxAICalls: 10000,                     // 10k AI calls/month
        estimatedCost: 25
      },
      scale: {
        maxUsers: 10000,
        maxStorage: 1024 * 1024 * 1024 * 1024, // 1TB total
        maxAICalls: 100000,                     // 100k AI calls/month
        estimatedCost: 200
      },
      enterprise: {
        maxUsers: Infinity,
        maxStorage: Infinity,
        maxAICalls: Infinity,
        estimatedCost: 500
      }
    };
  }

  // Monitor current usage
  async monitorUsage() {
    try {
      const User = require('../models/User');
      const Question = require('../models/Question');
      
      // Get current metrics
      this.usageMetrics.users = await User.countDocuments({ isActive: true });
      this.usageMetrics.aiCalls = await Question.countDocuments({ 
        source: 'ai_generated',
        createdAt: { $gte: this.getMonthStart() }
      });
      
      // Storage usage (simplified)
      this.usageMetrics.storageUsed = await this.calculateStorageUsage();
      
      // Estimate monthly cost
      this.usageMetrics.monthlyCost = this.estimateMonthlyCost();
      
      // Check if scaling is needed
      const scalingRecommendation = this.shouldScale();
      
      return {
        currentPhase: this.currentPhase,
        usage: this.usageMetrics,
        recommendation: scalingRecommendation,
        timestamp: new Date()
      };
      
    } catch (error) {
      console.error('Usage monitoring error:', error);
      return { error: error.message };
    }
  }

  // Check if scaling is needed
  shouldScale() {
    const currentLimits = this.phases[this.currentPhase];
    const usage = this.usageMetrics;
    
    const recommendations = [];
    
    // Check user limit
    if (usage.users > currentLimits.maxUsers * 0.8) {
      recommendations.push({
        type: 'users',
        current: usage.users,
        limit: currentLimits.maxUsers,
        urgency: usage.users > currentLimits.maxUsers ? 'critical' : 'warning',
        action: 'Consider upgrading to next tier'
      });
    }
    
    // Check storage limit
    if (usage.storageUsed > currentLimits.maxStorage * 0.8) {
      recommendations.push({
        type: 'storage',
        current: this.formatBytes(usage.storageUsed),
        limit: this.formatBytes(currentLimits.maxStorage),
        urgency: usage.storageUsed > currentLimits.maxStorage ? 'critical' : 'warning',
        action: 'Upgrade storage tier or cleanup old files'
      });
    }
    
    // Check AI usage
    if (usage.aiCalls > currentLimits.maxAICalls * 0.8) {
      recommendations.push({
        type: 'ai_calls',
        current: usage.aiCalls,
        limit: currentLimits.maxAICalls,
        urgency: usage.aiCalls > currentLimits.maxAICalls ? 'critical' : 'warning',
        action: 'Upgrade AI tier or optimize usage'
      });
    }
    
    // Cost monitoring
    if (usage.monthlyCost > this.costThreshold) {
      recommendations.push({
        type: 'cost',
        current: `$${usage.monthlyCost.toFixed(2)}`,
        limit: `$${this.costThreshold}`,
        urgency: 'warning',
        action: 'Review cost optimization strategies'
      });
    }
    
    return recommendations;
  }

  // Get scaling recommendations
  getScalingPlan() {
    const nextPhases = {
      demo: 'growth',
      growth: 'scale', 
      scale: 'enterprise'
    };
    
    const nextPhase = nextPhases[this.currentPhase];
    if (!nextPhase) return null;
    
    const current = this.phases[this.currentPhase];
    const next = this.phases[nextPhase];
    
    return {
      currentPhase: this.currentPhase,
      nextPhase: nextPhase,
      benefits: {
        users: `${current.maxUsers} ➡️ ${next.maxUsers === Infinity ? 'Unlimited' : next.maxUsers}`,
        storage: `${this.formatBytes(current.maxStorage)} ➡️ ${next.maxStorage === Infinity ? 'Unlimited' : this.formatBytes(next.maxStorage)}`,
        aiCalls: `${current.maxAICalls}/month ➡️ ${next.maxAICalls === Infinity ? 'Unlimited' : next.maxAICalls + '/month'}`,
        cost: `$${current.estimatedCost}/month ➡️ $${next.estimatedCost}/month`
      },
      migrationSteps: this.getMigrationSteps(this.currentPhase, nextPhase)
    };
  }

  // Get migration steps
  getMigrationSteps(from, to) {
    const migrations = {
      'demo-growth': [
        '1. Set up Cloudinary account',
        '2. Get Gemini API key',
        '3. Update DEPLOYMENT_PHASE=growth in .env',
        '4. Update STORAGE_TYPE=cloudinary',
        '5. Enable premium features',
        '6. Monitor costs closely'
      ],
      'growth-scale': [
        '1. Set up AWS S3 bucket',
        '2. Configure CloudFront CDN',
        '3. Get OpenAI API key',
        '4. Update DEPLOYMENT_PHASE=scale',
        '5. Update STORAGE_TYPE=aws-s3',
        '6. Enable advanced analytics',
        '7. Set up monitoring & alerts'
      ],
      'scale-enterprise': [
        '1. Contact for enterprise consultation',
        '2. Set up multi-region deployment',
        '3. Custom API integrations',
        '4. Dedicated support setup',
        '5. Custom branding implementation',
        '6. SLA agreement'
      ]
    };
    
    return migrations[`${from}-${to}`] || ['Custom migration plan needed'];
  }

  // Estimate monthly cost
  estimateMonthlyCost() {
    const storage = this.usageMetrics.storageUsed;
    const aiCalls = this.usageMetrics.aiCalls;
    
    let cost = 0;
    
    // Storage costs (rough estimates)
    if (this.currentPhase === 'growth') {
      cost += Math.max(0, (storage - 10 * 1024 * 1024 * 1024) / (1024 * 1024 * 1024) * 0.02); // Cloudinary overage
    } else if (this.currentPhase === 'scale') {
      cost += storage / (1024 * 1024 * 1024) * 0.023; // S3 costs
    }
    
    // AI costs (rough estimates)
    if (aiCalls > 1000) {
      const overageTokens = (aiCalls - 1000) * 1000; // Assume 1000 tokens per call
      if (this.currentPhase === 'growth') {
        cost += overageTokens / 1000000 * 0.075; // Gemini pricing
      } else if (this.currentPhase === 'scale') {
        cost += overageTokens / 1000000 * 0.15; // OpenAI pricing
      }
    }
    
    return cost;
  }

  // Helper methods
  getMonthStart() {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  }

  formatBytes(bytes) {
    if (bytes === 0) return '0 Bytes';
    if (bytes === Infinity) return 'Unlimited';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  async calculateStorageUsage() {
    // Simplified storage calculation
    // In production, this would query actual storage usage
    return this.usageMetrics.users * 10 * 1024 * 1024; // Assume 10MB per user
  }

  // Auto-scaling trigger (if enabled)
  async autoScale() {
    if (process.env.AUTO_SCALE !== 'true') return null;
    
    const recommendations = this.shouldScale();
    const criticalIssues = recommendations.filter(r => r.urgency === 'critical');
    
    if (criticalIssues.length > 0) {
      console.log('🚨 Critical scaling issues detected:', criticalIssues);
      
      // In production, this could automatically trigger scaling
      // For now, just log and alert
      
      return {
        autoScaled: false,
        reason: 'Auto-scaling requires manual approval',
        criticalIssues
      };
    }
    
    return null;
  }
}

module.exports = new ScalingService();
