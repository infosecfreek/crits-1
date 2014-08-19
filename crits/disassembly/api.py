from tastypie import authorization
from tastypie.authentication import MultiAuthentication
from tastypie.exceptions import BadRequest

from crits.disassembly.disassembly import Disassembly
from crits.disassembly.handlers import handle_disassembly_file
from crits.core.api import CRITsApiKeyAuthentication, CRITsSessionAuthentication
from crits.core.api import CRITsSerializer, CRITsAPIResource


class DisassemblyResource(CRITsAPIResource):
    """
    Class to handle everything related to the Disassembly API.

    Currently supports GET and POST.
    """

    class Meta:
        object_class = Disassembly
        allowed_methods = ('get', 'post')
        resource_name = "disassembly"
        authentication = MultiAuthentication(CRITsApiKeyAuthentication(),
                                             CRITsSessionAuthentication())
        authorization = authorization.Authorization()
        serializer = CRITsSerializer()

    def get_object_list(self, request):
        """
        Use the CRITsAPIResource to get our objects but provide the class to get
        the objects from.

        :param request: The incoming request.
        :type request: :class:`django.http.HttpRequest`
        :returns: Resulting objects in the specified format (JSON by default).

        """

        return super(DisassemblyResource, self).get_object_list(request, Disassembly)

    def obj_create(self, bundle, **kwargs):
        """
        Handles creating Disassembly through the API.

        :param bundle: Bundle containing the information to create the Disassembly.
        :type bundle: Tastypie Bundle object.
        :returns: Bundle object.
        :raises BadRequest: If filedata is not provided or creation fails.

        """

        analyst = bundle.request.user.username
        type_ = bundle.data.get('upload_type', None)
        if not type_:
            raise BadRequest('Must provide an upload type.')
        if type_ not in ('metadata', 'file'):
            raise BadRequest('Not a valid upload type.')
        if type_ == 'metadata':
            data = bundle.data.get('data', None)
        elif type_ == 'file':
            file_ = bundle.data.get('filedata', None)
            if not file_:
                raise BadRequest("Upload type of 'file' but no file uploaded.")
            data = file_.read()

        source = bundle.data.get('source', None)
        description = bundle.data.get('description', '')
        name = bundle.data.get('name', None)
        data_type = bundle.data.get('data_type', None)
        tool_name = bundle.data.get('tool_name', '')
        tool_version = bundle.data.get('tool_version', '')
        tool_details = bundle.data.get('tool_details', '')
        link_id = bundle.data.get('link_id', None)
        copy_rels = bundle.data.get('copy_relationships', False)
        method = 'Upload'
        bucket_list = bundle.data.get('bucket_list', None)
        ticket = bundle.data.get('ticket', None)

        if not name:
            raise BadRequest("Must provide a name.")
        if not data_type:
            raise BadRequest("Must provide a data type.")

        status = handle_disassembly_file(data, source, analyst,
                                      description, name, data_type,
                                      tool_name, tool_version, tool_details,
                                      link_id,
                                      method=method,
                                      copy_rels=copy_rels,
                                      bucket_list=bucket_list,
                                      ticket=ticket)
        if status['success']:
            return bundle
        else:
            raise BadRequest(status['message'])
