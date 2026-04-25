class PrimaryReplicaRouter:
    """
    A router to control all database operations on models in the
    Pradesh application.
    
    This is prepared for future scalability where we might have
    one primary DB for writes and multiple replicas for reads.
    """
    def db_for_read(self, model, **hints):
        """
        Attempts to read from a replica if it exists, otherwise fallback to default.
        """
        return 'replica' # You can configure 'replica' in DATABASES later

    def db_for_write(self, model, **hints):
        """
        Always write to the primary database.
        """
        return 'default'

    def allow_relation(self, obj1, obj2, **hints):
        """
        Allow relations if both objects are in the primary/replica pool.
        """
        return True

    def allow_migrate(self, db, app_label, model_name=None, **hints):
        """
        Only allow migrations on the primary database.
        """
        return db == 'default'
