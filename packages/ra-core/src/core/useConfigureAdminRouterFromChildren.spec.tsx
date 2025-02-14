import * as React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import expect from 'expect';
import { createMemoryHistory } from 'history';
import { useResourceDefinitions } from './useResourceDefinitions';
import { CoreAdminContext } from './CoreAdminContext';
import { CoreAdminRoutes } from './CoreAdminRoutes';
import { Resource } from './Resource';
import { CoreLayoutProps } from '../types';
import { AuthProvider, ResourceProps } from '..';

const ResourceDefinitionsTestComponent = () => {
    const definitions = useResourceDefinitions();
    if (!definitions) return null;
    return (
        <ul>
            {Object.keys(definitions).map(key => (
                <li key={key} data-resource={key}>
                    {JSON.stringify(definitions[key])}
                </li>
            ))}
        </ul>
    );
};

const MyLayout = ({ children }: CoreLayoutProps) => (
    <>
        <ResourceDefinitionsTestComponent />
        {children}
    </>
);
const CatchAll = () => <div />;
const Loading = () => <>Loading</>;

const TestedComponent = ({ role }) => {
    const history = createMemoryHistory();

    return (
        <CoreAdminContext history={history}>
            <CoreAdminRoutes
                layout={MyLayout}
                catchAll={CatchAll}
                loading={Loading}
            >
                <Resource name="posts" />
                <Resource name="comments" />
                {() =>
                    role === 'admin'
                        ? [<Resource name="user" />, <Resource name="admin" />]
                        : role === 'user'
                        ? [<Resource name="user" />]
                        : []
                }
            </CoreAdminRoutes>
        </CoreAdminContext>
    );
};

const ResourceWithPermissions = (props: ResourceProps) => (
    <Resource {...props} />
);
ResourceWithPermissions.raName = 'Resource';
ResourceWithPermissions.registerResource = (
    { create, edit, icon, list, name, options, show }: ResourceProps,
    permissions: any
) => ({
    name,
    options,
    hasList: !!list && permissions && permissions[name]?.list,
    hasCreate: !!create && permissions && permissions[name]?.create,
    hasEdit: !!edit && permissions && permissions[name]?.edit,
    hasShow: !!show && permissions && permissions[name]?.show,
    icon,
});

const TestedComponentWithPermissions = () => {
    const history = createMemoryHistory();
    const authProvider: AuthProvider = {
        login: () => Promise.resolve(),
        logout: () => Promise.resolve(),
        checkAuth: () => Promise.resolve(),
        checkError: () => Promise.resolve(),
        getPermissions: () =>
            Promise.resolve({
                posts: {
                    list: true,
                    create: true,
                    edit: true,
                    show: true,
                },
                comments: {
                    list: true,
                    create: false,
                    edit: false,
                    show: true,
                },
                users: {
                    list: true,
                    create: false,
                    edit: false,
                    show: false,
                },
            }),
    };

    return (
        <CoreAdminContext authProvider={authProvider} history={history}>
            <CoreAdminRoutes
                layout={MyLayout}
                catchAll={CatchAll}
                loading={Loading}
            >
                <ResourceWithPermissions
                    name="posts"
                    list={<div />}
                    create={<div />}
                    edit={<div />}
                    show={<div />}
                />
                <ResourceWithPermissions
                    name="comments"
                    list={<div />}
                    create={<div />}
                    edit={<div />}
                    show={<div />}
                />
                <ResourceWithPermissions
                    name="users"
                    list={<div />}
                    create={<div />}
                    edit={<div />}
                    show={<div />}
                />
            </CoreAdminRoutes>
        </CoreAdminContext>
    );
};

const expectResource = (resource: string) =>
    expect(screen.queryByText(`"name":"${resource}"`, { exact: false }));

const expectResourceView = (
    resource: string,
    view: 'list' | 'create' | 'edit' | 'show'
) =>
    expect(
        screen.queryByText(
            `"has${view.at(0).toUpperCase()}${view.substring(1)}":true`,
            {
                selector: `[data-resource=${resource}]`,
                exact: false,
            }
        )
    );

describe('useConfigureAdminRouterFromChildren', () => {
    it('should always load static resources', async () => {
        render(<TestedComponent role="guest" />);
        await waitFor(() => expect(screen.queryByText('Loading')).toBeNull());
        await waitFor(() => expectResource('posts').not.toBeNull());
        expectResource('comments').not.toBeNull();
        expectResource('user').toBeNull();
        expectResource('admin').toBeNull();
    });
    it('should load dynamic resource definitions', async () => {
        render(<TestedComponent role="admin" />);
        await waitFor(() => expect(screen.queryByText('Loading')).toBeNull());
        expectResource('user').not.toBeNull();
        expectResource('admin').not.toBeNull();
    });
    it('should call registerResource with the permissions', async () => {
        render(<TestedComponentWithPermissions />);
        await waitFor(() => expect(screen.queryByText('Loading')).toBeNull());

        expectResourceView('posts', 'list').not.toBeNull();
        expectResourceView('posts', 'create').not.toBeNull();
        expectResourceView('posts', 'edit').not.toBeNull();
        expectResourceView('posts', 'show').not.toBeNull();
        expectResourceView('comments', 'list').not.toBeNull();
        expectResourceView('comments', 'create').toBeNull();
        expectResourceView('comments', 'edit').toBeNull();
        expectResourceView('comments', 'show').not.toBeNull();
        expectResourceView('users', 'list').not.toBeNull();
        expectResourceView('users', 'create').toBeNull();
        expectResourceView('users', 'edit').toBeNull();
        expectResourceView('users', 'show').toBeNull();
    });
    it('should allow adding new resource after the first render', async () => {
        const { rerender } = render(<TestedComponent role="user" />);
        await waitFor(() => expect(screen.queryByText('Loading')).toBeNull());
        expectResource('posts').not.toBeNull();
        expectResource('comments').not.toBeNull();
        expectResource('user').not.toBeNull();
        expectResource('admin').toBeNull();

        rerender(<TestedComponent role="admin" />);
        await waitFor(() => expect(screen.queryByText('Loading')).toBeNull());
        expectResource('posts').not.toBeNull();
        expectResource('comments').not.toBeNull();
        expectResource('user').not.toBeNull();
        expectResource('admin').not.toBeNull();
    });
    it('should allow removing a resource after the first render', async () => {
        const { rerender } = render(<TestedComponent role="admin" />);
        await waitFor(() => expect(screen.queryByText('Loading')).toBeNull());
        expectResource('posts').not.toBeNull();
        expectResource('comments').not.toBeNull();
        expectResource('user').not.toBeNull();
        expectResource('admin').not.toBeNull();

        rerender(<TestedComponent role="user" />);
        await waitFor(() => expect(screen.queryByText('Loading')).toBeNull());
        expectResource('posts').not.toBeNull();
        expectResource('comments').not.toBeNull();
        expectResource('user').not.toBeNull();
        expectResource('admin').toBeNull();
    });
});
