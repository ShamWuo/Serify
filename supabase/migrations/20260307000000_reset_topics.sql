-- Reset topic associations to force re-categorization into broad domains
UPDATE knowledge_nodes
SET topic_id = NULL, topic_name = NULL;

DELETE FROM concept_topics;
